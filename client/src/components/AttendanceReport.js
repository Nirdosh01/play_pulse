import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FileText, Download, Calendar, Clock, Users } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AttendanceReport = ({ enrollmentId }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [instituteName, setInstituteName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [isEntryMode, setIsEntryMode] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const fetchInstituteName = useCallback(async (instituteId, token) => {
    try {
      const response = await axios.get(`http://localhost:1000/api/institute/${instituteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data?.name || null;
    } catch (err) {
      console.error('Error fetching institute name:', err);
      return null;
    }
  }, []);

  const fetchEnrollmentDetails = useCallback(async (enrollmentId, token, userRole) => {
    try {
      // For coach role, first try to get the enrollment details directly
      if (userRole === 'coach') {
        const coachEnrollmentResponse = await axios.get(
          `http://localhost:1000/api/coach/enrollment/${enrollmentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (coachEnrollmentResponse.data?.institute) {
          return coachEnrollmentResponse.data;
        }
      }

      const reportUrl = userRole === 'coach' 
        ? `http://localhost:1000/api/coach/attendance/${enrollmentId}/report`
        : `http://localhost:1000/api/parent/attendance/${enrollmentId}/report`;

      const reportResponse = await axios.get(reportUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (reportResponse.data?.student?.institute) {
        return {
          institute: reportResponse.data.student.institute
        };
      }

      return null;
    } catch (err) {
      console.error('Error fetching enrollment details:', err);
      return null;
    }
  }, []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !user) {
        throw new Error('Authentication required');
      }

      setUserRole(user.role);

      const enrollmentData = await fetchEnrollmentDetails(enrollmentId, token, user.role);

      if (enrollmentData?.institute) {
        if (typeof enrollmentData.institute === 'object') {
          if (enrollmentData.institute.name) {
            setInstituteName(enrollmentData.institute.name);
          } else if (enrollmentData.institute._id) {
            const name = await fetchInstituteName(enrollmentData.institute._id, token);
            if (name) setInstituteName(name);
          }
        } else if (typeof enrollmentData.institute === 'string') {
          if (enrollmentData.institute.length === 24) {
            const name = await fetchInstituteName(enrollmentData.institute, token);
            if (name) setInstituteName(name);
          } else {
            setInstituteName(enrollmentData.institute);
          }
        }
      }

      const url = user.role === 'coach'
        ? `http://localhost:1000/api/coach/attendance/${enrollmentId}/report`
        : `http://localhost:1000/api/parent/attendance/${enrollmentId}/report`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.data) {
        throw new Error('No data received from server');
      }

      setReport(response.data);

      if (!instituteName && response.data.student?.institute) {
        if (typeof response.data.student.institute === 'object') {
          if (response.data.student.institute.name) {
            setInstituteName(response.data.student.institute.name);
          } else if (response.data.student.institute._id) {
            const name = await fetchInstituteName(response.data.student.institute._id, token);
            if (name) setInstituteName(name);
          }
        } else if (typeof response.data.student.institute === 'string') {
          if (response.data.student.institute.length === 24) {
            const name = await fetchInstituteName(response.data.student.institute, token);
            if (name) setInstituteName(name);
          } else {
            setInstituteName(response.data.student.institute);
          }
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, fetchEnrollmentDetails, fetchInstituteName, instituteName]);

  useEffect(() => {
    if (enrollmentId) {
      fetchReportData();
    } else {
      setError('No enrollment ID provided');
      setLoading(false);
    }
  }, [enrollmentId, fetchReportData]);

  const generatePdf = () => {
    if (!report) {
      console.error('No report data available for PDF generation');
      setError('No report data available');
      return;
    }
    
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 128);
      doc.text('PlayPulse Sports Academy', 105, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Attendance Report', 105, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Student Name: ${report.student.name}`, 20, 45);
      doc.text(`Program: ${report.student.program}`, 20, 52);
      doc.text(`Institute: ${instituteName || 'Not Available'}`, 20, 59);
      doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 20, 66);
      
      doc.setFontSize(14);
      doc.text('Attendance Summary', 20, 80);
      
      const summaryData = [
        ['Total Days', report.summary.totalDays],
        ['Present Days', report.summary.presentDays],
        ['Absent Days', report.summary.absentDays],
        ['Attendance Rate', `${report.summary.attendanceRate}%`]
      ];
      
      autoTable(doc, {
        startY: 85,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 128], textColor: [255, 255, 255] },
        styles: { fontSize: 12 }
      });
      
      doc.setFontSize(14);
      doc.text('Attendance History', 20, doc.lastAutoTable.finalY + 20);
      
      const attendanceData = report.attendance.map(a => {
        const date = new Date(a.date);
        return [
          date.toLocaleDateString(),
          a.session || 'N/A',
          a.status.charAt(0).toUpperCase() + a.status.slice(1)
        ];
      });
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        head: [['Date', 'Session', 'Status']],
        body: attendanceData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 128], textColor: [255, 255, 255] },
        styles: { fontSize: 12 },
        columnStyles: {
          1: {
            fontStyle: 'bold',
            textColor: (cell) => {
              return cell.raw === 'Present' ? [40, 167, 69] : [220, 53, 69];
            }
          }
        }
      });
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generated by PlayPulse Sports Academy - Page ${i} of ${pageCount}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
      
      const fileName = `attendance_report_${report.student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(`Failed to generate PDF report: ${err.message}`);
    }
  };

  const handleAttendanceSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const attendanceData = students.map(student => ({
        enrollmentId: student._id,
        date: selectedDate,
        session: selectedSession,
        status: attendanceStatus[student._id] || 'absent'
      }));

      const response = await axios.post('http://localhost:1000/api/coach/attendance/bulk', attendanceData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Attendance recorded successfully');
        setIsEntryMode(false);
        fetchReportData(); // Refresh the report
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit attendance');
    }
  };

  const toggleAttendanceStatus = (studentId) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const fetchStudentsForAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:1000/api/coach/program/${enrollmentId}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch students');
    }
  };

  const getSessionLabel = (session) => {
    switch (session?.toLowerCase()) {
      case 'morning':
        return 'Morning Session';
      case 'afternoon':
        return 'Afternoon Session';
      case 'evening':
        return 'Evening Session';
      default:
        return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading attendance report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-0">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="alert alert-info">
        <p className="mb-0">No report data available.</p>
      </div>
    );
  }

  return (
    <div className="attendance-report p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <FileText className="me-2" size={24} />
          Attendance Report
        </h2>
        <div>
          {userRole === 'coach' && !isEntryMode && (
            <button 
              className="btn btn-primary me-2" 
              onClick={() => {
                setIsEntryMode(true);
                fetchStudentsForAttendance();
              }}
            >
              <Users className="me-2" size={18} />
              Take Attendance
            </button>
          )}
          <button 
            className="btn btn-success" 
            onClick={generatePdf}
          >
            <Download className="me-2" size={18} />
            Download PDF
          </button>
        </div>
      </div>
      
      {isEntryMode && userRole === 'coach' ? (
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">
            <h4 className="mb-0">Take Attendance</h4>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-6">
                <label className="form-label">
                  <Calendar className="me-2" size={18} />
                  Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">
                  <Clock className="me-2" size={18} />
                  Session
                </label>
                <select
                  className="form-select"
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                >
                  <option value="">Select Session</option>
                  <option value="morning">Morning Session</option>
                  <option value="evening">Evening Session</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>
                        <span className={`badge ${attendanceStatus[student._id] === 'present' ? 'bg-success' : 'bg-danger'}`}>
                          {attendanceStatus[student._id] === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${attendanceStatus[student._id] === 'present' ? 'btn-success' : 'btn-outline-success'} me-2`}
                          onClick={() => toggleAttendanceStatus(student._id)}
                        >
                          {attendanceStatus[student._id] === 'present' ? 'Mark Absent' : 'Mark Present'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end mt-4">
              <button
                className="btn btn-secondary me-2"
                onClick={() => setIsEntryMode(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAttendanceSubmit}
                disabled={!selectedSession}
              >
                Submit Attendance
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Student Information</h4>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <p><strong>Name:</strong> {report.student.name}</p>
            </div>
            <div className="col-md-4">
              <p><strong>Program:</strong> {report.student.program}</p>
            </div>
            <div className="col-md-4">
              <p><strong>Institute:</strong> {instituteName || 'Not Available'}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Attendance Summary</h4>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <div className="card bg-light mb-3">
                <div className="card-body text-center">
                  <h3 className="mb-0">{report.summary.totalDays}</h3>
                  <p className="text-muted mb-0">Total Days</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white mb-3">
                <div className="card-body text-center">
                  <h3 className="mb-0">{report.summary.presentDays}</h3>
                  <p className="mb-0">Present</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-danger text-white mb-3">
                <div className="card-body text-center">
                  <h3 className="mb-0">{report.summary.absentDays}</h3>
                  <p className="mb-0">Absent</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info text-white mb-3">
                <div className="card-body text-center">
                  <h3 className="mb-0">{report.summary.attendanceRate}%</h3>
                  <p className="mb-0">Attendance Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Attendance History</h4>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Date</th>
                      <th>Session</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.attendance.map((record, index) => (
                  <tr key={`${record.date}-${index}`}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                        <td>
                          <span className="badge bg-info">
                            {getSessionLabel(record.session)}
                          </span>
                        </td>
                    <td>
                      <span className={`badge ${record.status === 'present' ? 'bg-success' : 'bg-danger'}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default AttendanceReport; 