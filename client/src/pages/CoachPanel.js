import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bell, LogOut, Home, Users, Calendar, MessageSquare, Award, FileText, BarChart, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import AttendanceReport from '../components/AttendanceReport.js'; 

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function CoachDashboard({ user }) {
  const [dashboardData, setDashboardData] = useState({
    coach: null,
    enrollments: [],
    notifications: [],
    progress: [],
    materials: [],
    programSchedules: [],
    chatMessages: [],
    rewards: [],
    attendance: []
  });
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [scheduleInput, setScheduleInput] = useState({ date: null, description: '' });
  const [coachId, setCoachId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStudentAttendance, setSelectedStudentAttendance] = useState(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [showSessionSelection, setShowSessionSelection] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const navigate = useNavigate();

  const SESSIONS = [
    { id: 'morning', name: 'Morning Session', timeRange: '6:00 AM - 12:00 PM' },
    { id: 'afternoon', name: 'Afternoon Session', timeRange: '1:00 PM - 5:00 PM' },
    { id: 'evening', name: 'Evening Session', timeRange: '6:00 PM - 9:00 PM' }
  ];

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('Dashboard request token:', token);
      if (!token) {
        setError('No token found. Redirecting to login.');
        navigate('/login');
        return;
      }
      const response = await axios.get('http://localhost:1000/api/coach/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData({
        ...response.data,
        progress: response.data.progress || [],
        attendance: response.data.attendance || [],
        chatMessages: response.data.chatMessages || []
      });
      const storedUser = JSON.parse(localStorage.getItem('user'));
      setCoachId(response.data.coach?.user || storedUser?._id);
      setLoading(false);
    } catch (err) {
      console.error('Dashboard fetch error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
      setLoading(false);
    }
  }, [navigate]);

  const fetchChatMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Chat messages request token:', token);
      if (!token) {
        setError('No token found for chat messages.');
        return;
      }
      const response = await axios.get('http://localhost:1000/api/coach/chat-messages', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Chat Messages received:', response.data);
      
      // Remove duplicates based on message ID and create unique keys
      const uniqueMessages = response.data.reduce((acc, current) => {
        const existingMessage = acc.find(item => item._id === current._id);
        if (!existingMessage) {
          // Add a unique timestamp to each message for key generation
          return acc.concat([{ ...current, uniqueTimestamp: Date.now() }]);
        }
          return acc;
      }, []);

      setDashboardData(prev => ({ ...prev, chatMessages: uniqueMessages }));
    } catch (err) {
      console.error('Chat messages fetch error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to load messages');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!token || !storedUser || storedUser.role !== 'coach') {
      navigate('/login');
      return;
    }
    fetchDashboardData();
    fetchChatMessages(); // Fetch initial chat messages
    const interval = setInterval(fetchChatMessages, 1000); // Poll every second
    return () => clearInterval(interval); // Cleanup
  }, [navigate, fetchDashboardData]); // Added fetchDashboardData to dependencies

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found. Please log in again.');
      navigate('/login');
      return;
    }
  
    try {
      console.log('Sending message with:', { 
        receiverId: selectedChat.parentId, 
        content: newMessage, 
        enrollmentId: selectedChat.enrollmentId 
      });
  
      const response = await axios.post(
        'http://localhost:1000/api/coach/chat-message',
        { 
          receiverId: selectedChat.parentId, 
          content: newMessage, 
          enrollmentId: selectedChat.enrollmentId 
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
  
      console.log('Message sent successfully:', response.data);
      setNewMessage('');
      await fetchChatMessages();
    } catch (err) {
      console.error('Send message error:', err.response?.data || err.message);
      
      if (err.response?.status === 401) {
        // Token expired or invalid
        setError('Your session has expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to send message');
      }
    }
  };
  
  // Progress calculation (unchanged)
  const calculateProgressData = () => {
    if (!selectedStudentId) return { labels: [], datasets: [] };
    const enrollment = dashboardData.enrollments.find(e => e._id === selectedStudentId);
    if (!enrollment) return { labels: [], datasets: [] };
    const startDate = new Date(enrollment.createdAt);
    const endDate = new Date();
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const baseline = 50;
    const progressEntries = (dashboardData.progress || []).filter(p => p.enrollment._id === selectedStudentId);
    const attendanceEntries = (dashboardData.attendance || []).filter(a => a.enrollment.toString() === selectedStudentId);
    const dailyProgress = [];
    let currentScore = baseline;

    for (let i = 0; i <= days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const progressEntry = progressEntries.find(p => new Date(p.date).toDateString() === currentDate.toDateString());
      const attendanceEntry = attendanceEntries.find(a => new Date(a.date).toDateString() === currentDate.toDateString());
      if (progressEntry) currentScore = progressEntry.progressScore;
      else if (attendanceEntry) currentScore += attendanceEntry.status === 'present' ? 2 : -3;
      else currentScore -= 1;
      currentScore = Math.max(0, Math.min(100, currentScore));
      dailyProgress.push({ date: currentDate.toLocaleDateString(), score: currentScore });
    }
    return {
      labels: dailyProgress.map(dp => dp.date),
      datasets: [{
        label: 'Progress Score',
        data: dailyProgress.map(dp => dp.score),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false,
        tension: 0.4
      }]
    };
  };

  const progressData = calculateProgressData();

  // Fetch detailed attendance history for a student
  const fetchStudentAttendanceHistory = async (enrollmentId) => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:1000/api/coach/student/${enrollmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedStudentAttendance(response.data.attendance);
        const modal = new window.bootstrap.Modal(document.getElementById('attendanceHistoryModal'));
        modal.show();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load attendance history');
      }
    };
    

    // Logout Handler
    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    };

    // Fetch Student Details
    const fetchStudentDetails = async (enrollmentId) => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:1000/api/coach/student/${enrollmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedStudent(response.data);
        const modal = new window.bootstrap.Modal(document.getElementById('studentDetailsModal'));
        modal.show();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load student details');
      }
    };

    // Handle Program Click for Schedule
    const handleProgramClick = (program) => {
      const existingSchedule = dashboardData.programSchedules.find(ps => ps.program._id === program._id) || { duration: 0, schedule: [], startDate: new Date() };
      setSelectedProgram({ program, schedule: existingSchedule });
      const modal = new window.bootstrap.Modal(document.getElementById('scheduleModal'));
      modal.show();
    };

   
    // Calendar Helpers
    const getCalendarDays = (startDate, duration) => {
      const days = [];
      let currentDate = new Date(startDate);
      let daysAdded = 0;

      while (daysAdded < duration) {
        if (currentDate.getDay() !== 0) {
          days.push(new Date(currentDate));
          daysAdded++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return days;
    };

    const getScheduleForDate = (date, schedule) => {
      const formattedDate = date.toISOString().split('T')[0];
      let lastSchedule = null;
      for (const s of schedule.sort((a, b) => new Date(a.date) - new Date(b.date))) {
        if (new Date(s.date).toISOString().split('T')[0] <= formattedDate) {
          lastSchedule = s.activity;
        } else {
          break;
        }
      }
      const exactMatch = schedule.find(s => new Date(s.date).toISOString().split('T')[0] === formattedDate);
      return exactMatch ? exactMatch.activity : lastSchedule || 'Not Set';
    };

    // Add Schedule
    const handleAddSchedule = async (programId, date, description, currentSchedule) => {
      const updatedSchedule = [...currentSchedule];
      const existingIndex = updatedSchedule.findIndex(s => new Date(s.date).toISOString().split('T')[0] === date.toISOString().split('T')[0]);
      if (existingIndex >= 0) {
        updatedSchedule[existingIndex].activity = description;
      } else {
        updatedSchedule.push({ date, activity: description, time: 'TBD' });
      }

      const token = localStorage.getItem('token');
      const programSchedule = dashboardData.programSchedules.find(ps => ps.program._id === programId) || { duration: 10, startDate: new Date() };
      await axios.post('http://localhost:1000/api/coach/schedule', {
        programId,
        duration: programSchedule.duration,
        schedule: updatedSchedule,
        startDate: programSchedule.startDate
      }, { headers: { Authorization: `Bearer ${token}` } });

      const response = await axios.get('http://localhost:1000/api/coach/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
      setSelectedProgram(prev => prev ? { 
        ...prev, 
        schedule: { 
          ...prev.schedule, 
          schedule: updatedSchedule,
          duration: programSchedule.duration,
          startDate: programSchedule.startDate
        } 
      } : null);
      setScheduleInput({ date: null, description: '' });
    };

  // Handle Attendance Selection
    const handleAttendanceSubmit = async (programId) => {
    try {
      // Validate required data
      if (!selectedDate || !selectedSession) {
        alert('Please select both date and session before submitting attendance');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }

      const enrollmentsForProgram = dashboardData.enrollments.filter(e => e.program._id === programId);
      if (enrollmentsForProgram.length === 0) {
        alert('No students found for this program');
        return;
      }

      // Format the date to ensure it's in the correct format
      const formattedDate = new Date(selectedDate).toISOString().split('T')[0];

      // Format the attendance data according to the server's expectations
      const attendanceData = enrollmentsForProgram.map(enrollment => {
        const status = attendanceStatus[enrollment._id] || 'absent';
        return {
        enrollmentId: enrollment._id,
          date: formattedDate,
          session: selectedSession,
          status: status
        };
      });

      console.log('Submitting attendance data:', {
        programId,
        selectedDate: formattedDate,
        selectedSession,
        attendanceData
      });

      const response = await axios.post(
        'http://localhost:1000/api/coach/attendance/bulk',
        { attendanceData },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      console.log('Server response:', response.data);

      if (response.data.success) {
        alert('Attendance recorded successfully');
        setAttendanceStatus({});
        await fetchDashboardData(); // Refresh the dashboard data
      } else {
        throw new Error(response.data.message || 'Failed to submit attendance');
      }
    } catch (err) {
      console.error('Attendance submission error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.status === 401) {
        alert('Your session has expired. Please log in again.');
        return;
      }
      
      alert(err.response?.data?.message || err.message || 'Failed to submit attendance');
    }
  };

  const toggleAttendanceStatus = (enrollmentId) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [enrollmentId]: prev[enrollmentId] === 'present' ? 'absent' : 'present'
    }));
  };

  // New function to open attendance report modal
  const openAttendanceReport = (enrollmentId) => {
    setSelectedStudentForReport(enrollmentId);
    const modal = new window.bootstrap.Modal(document.getElementById('attendanceReportModal'), {
      focus: true,
      keyboard: true,
      backdrop: 'static'
    });
    modal.show();
  };


    if (loading) return <div>Loading...</div>;
    if (error) return <div className="alert alert-danger">{error}</div>;

    return (
      <div className="d-flex min-vh-100">
        {/* Sidebar */}
        <div className="bg-dark text-white p-3" style={{ width: '250px' }}>
          <h4 className="text-center mb-4">Coach Portal</h4>
          <ul className="nav flex-column">
            <li className="nav-item"><button className="nav-link text-white" onClick={() => setActiveSection('overview')}><Home className="me-2" /> Overview</button></li>
            <li className="nav-item"><button className="nav-link text-white" onClick={() => setActiveSection('students')}><Users className="me-2" /> Students</button></li>
            <li className="nav-item"><button className="nav-link text-white" onClick={() => setActiveSection('schedule')}><Calendar className="me-2" /> Schedule</button></li>
            <li className="nav-item"><button className="nav-link text-white" onClick={() => setActiveSection('messages')}><MessageSquare className="me-2" /> Messages</button></li>
            <li className="nav-item"><button className="nav-link text-white" onClick={() => setActiveSection('gamification')}><Award className="me-2" /> Rewards</button></li>
            <li className="nav-item"><button className="nav-link text-white" onClick={() => setActiveSection('materials')}><FileText className="me-2" /> Training Materials</button></li>
            <li className="nav-item"><button className="nav-link text-white" onClick={() => setActiveSection('progress')}><BarChart className="me-2" /> Progress</button></li>
            <li className="nav-item"><button className="nav-link text-white" onClick={() => setActiveSection('attendance')}><CheckCircle className="me-2" /> Attendance</button></li>
            <li className="nav-item mt-auto"><button className="nav-link text-white" onClick={handleLogout}><LogOut className="me-2" /> Logout</button></li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="flex-grow-1 p-4">
          <div className="d-flex justify-content-between align-items-center mb-4 bg-light p-3 shadow-sm">
            <h2>Welcome, {user?.name}</h2>
            <div className="position-relative">
              <Bell className="h-5 w-5" />
              {dashboardData.notifications.length > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {dashboardData.notifications.length}
                </span>
              )}
            </div>
          </div>
          {activeSection === 'overview' && (
    <div>
      <h3>Overview</h3>
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card shadow text-center" style={{ cursor: 'pointer' }} data-bs-toggle="modal" data-bs-target="#programsModal">
            <div className="card-body">
              <h6 className="card-title">Total Assigned Programs</h6>
              <p className="card-text fs-4">{dashboardData.coach?.assignedPrograms.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card shadow text-center" style={{ cursor: 'pointer' }} data-bs-toggle="modal" data-bs-target="#absentModal">
            <div className="card-body">
              <h6 className="card-title">Absent Students Today</h6>
              <p className="card-text fs-4">
                {dashboardData.attendance.filter(a => 
                  new Date(a.date).toLocaleDateString() === new Date('2025-03-26').toLocaleDateString() && 
                  a.status === 'absent'
                ).length}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card shadow text-center" style={{ cursor: 'pointer' }} data-bs-toggle="modal" data-bs-target="#presentModal">
            <div className="card-body">
              <h6 className="card-title">Total Present Today</h6>
              <p className="card-text fs-4">
                {dashboardData.attendance.filter(a => 
                  new Date(a.date).toLocaleDateString() === new Date('2025-03-26').toLocaleDateString() && 
                  a.status === 'present'
                ).length}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
      <div className="card shadow text-center" style={{ cursor: 'pointer' }} data-bs-toggle="modal" data-bs-target="#badgesModal">
          <div className="card-body">
          <h6 className="card-title">Highest Points</h6>
          <p className="card-text fs-4">
              {dashboardData.rewards
              .filter(r => r.userId) // Keep only student-related rewards
              .reduce((max, r) => (r.points || 0) > (max.points || 0) ? r : max, { points: 0 })
              .points || 0}
          </p>
          </div>
      </div>
      </div>

      </div>

      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card shadow">
            <div className="card-body">
              <h5 className="card-title">Assigned Programs</h5>
              <ul className="list-group list-group-flush">
                {dashboardData.coach?.assignedPrograms.map(program => (
                  <li key={program._id} className="list-group-item">{program.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="programsModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Assigned Programs</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <ul className="list-group">
                {dashboardData.coach?.assignedPrograms.map(program => (
                  <li key={program._id} className="list-group-item">{program.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="absentModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Absent Students Today</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <ul className="list-group">
                {dashboardData.attendance
                  .filter(a => new Date(a.date).toLocaleDateString() === new Date('2025-03-26').toLocaleDateString() && a.status === 'absent')
                  .map(a => (
                    <li key={a._id} className="list-group-item">
                      {dashboardData.enrollments.find(e => e._id === a.enrollment.toString())?.childName || 'Unknown'}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="presentModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Present Students Today</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <ul className="list-group">
                {dashboardData.attendance
                  .filter(a => new Date(a.date).toLocaleDateString() === new Date('2025-03-26').toLocaleDateString() && a.status === 'present')
                  .map(a => (
                    <li key={a._id} className="list-group-item">
                      {dashboardData.enrollments.find(e => e._id === a.enrollment.toString())?.childName || 'Unknown'}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="badgesModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Student with Highest Badges</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              {(() => {
                const topStudent = dashboardData.rewards
                  .filter(r => r.userId)
                  .reduce((max, r) => (r.badges?.length || 0) > (max.badges?.length || 0) ? r : max, { badges: [] });
                const enrollment = dashboardData.enrollments.find(e => e.parent._id === topStudent.userId?.toString());
                return (
                  <div>
                    <p><strong>Student:</strong> {enrollment?.childName || 'Unknown'}</p>
                    <p><strong>Badges:</strong> {topStudent.badges?.join(', ') || 'None'}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

          {/* Students */}
          {activeSection === 'students' && (
            <div>
              <h3>Enrolled Students</h3>
              <div className="card shadow">
                <div className="card-body">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Child Name</th>
                        <th>Program</th>
                        <th>Parent</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.enrollments.map(enrollment => (
                        <tr key={enrollment._id}>
                          <td>{enrollment.childName}</td>
                          <td>{enrollment.program.name}</td>
                          <td>{enrollment.parent.name} ({enrollment.parent.email})</td>
                          <td>
                            <button className="btn btn-sm btn-primary" onClick={() => fetchStudentDetails(enrollment._id)}>Details</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Schedule */}
          {activeSection === 'schedule' && (
            <div>
              <h3>Training Schedule</h3>
              <div className="row">
                {dashboardData.coach?.assignedPrograms.map(program => {
                  const scheduleData = dashboardData.programSchedules.find(ps => ps.program._id === program._id) || { duration: 0, schedule: [], startDate: new Date() };
                  const calendarDays = getCalendarDays(scheduleData.startDate || new Date(), scheduleData.duration || 10);

                  return (
                    <div key={program._id} className="col-md-6 mb-3">
                      <div className="card shadow" style={{ cursor: 'pointer' }} onClick={() => handleProgramClick(program)}>
                        <div className="card-body">
                          <h5 className="card-title">{program.name}</h5>
                          <p><strong>Duration:</strong> {scheduleData.duration ? `${scheduleData.duration} days` : 'Not set'}</p>
                          <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                            {calendarDays.map((day, idx) => (
                              <div
                                key={idx}
                                className="calendar-day p-2 border text-center"
                                style={{ background: getScheduleForDate(day, scheduleData.schedule) !== 'Not Set' ? '#e0f7fa' : '#fff' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScheduleInput({ date: day, description: getScheduleForDate(day, scheduleData.schedule) });
                                }}
                              >
                                <div>{day.getDate()}</div>
                                <button
                                  className="btn btn-sm btn-outline-primary mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setScheduleInput({ date: day, description: getScheduleForDate(day, scheduleData.schedule) });
                                  }}
                                >
                                  +
                                </button>
                                {scheduleInput.date && scheduleInput.date.toISOString().split('T')[0] === day.toISOString().split('T')[0] && (
                                  <div className="position-absolute bg-white p-2 border shadow" style={{ zIndex: 10 }}>
                                    <input
                                      type="text"
                                      className="form-control mb-2"
                                      value={scheduleInput.description}
                                      onChange={(e) => setScheduleInput({ ...scheduleInput, description: e.target.value })}
                                      placeholder="e.g., Theory"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddSchedule(program._id, day, scheduleInput.description, scheduleData.schedule);
                                      }}
                                    >
                                      OK
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

{activeSection === 'messages' && (
          <div>
            <h3>Messages</h3>
            <div className="card shadow" style={{ height: '70vh' }}>
              <div className="card-body d-flex p-0 h-100">
                <div className="col-4 border-end p-3" style={{ overflowY: 'auto' }}>
                  {dashboardData.enrollments.length > 0 ? (
                    dashboardData.enrollments.map(e => (
                      <div
                        key={e._id}
                        className={`p-2 mb-2 border rounded ${selectedChat?.enrollmentId === e._id ? 'bg-light' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedChat({ enrollmentId: e._id, parentId: e.parent?._id, name: e.childName })}
                      >
                        {e.childName} ({e.program?.name || 'Unknown Program'})
                      </div>
                    ))
                  ) : (
                    <p>No enrolled students available</p>
                  )}
                </div>
                <div className="col-8 p-3 d-flex flex-column" style={{ height: '100%' }}>
                  {selectedChat ? (
                    coachId || user?._id ? (
                      <>
                        <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
                          <strong>{selectedChat.name}</strong>
                          <button className="btn btn-sm btn-outline-primary" onClick={fetchChatMessages}>
                            Refresh
                          </button>
                        </div>
                        <div
                          style={{
                            flex: '1 1 auto',
                            maxHeight: 'calc(70vh - 120px)',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          {dashboardData.chatMessages
                            .filter(m => {
                              const userId = (coachId || user?._id)?.toString();
                              const parentId = selectedChat.parentId?.toString();
                              const enrollmentId = selectedChat.enrollmentId?.toString();
                              return (
                                (m.enrollment?._id?.toString() === enrollmentId) ||
                                ((m.sender?._id?.toString() === userId && m.receiver?._id?.toString() === parentId) ||
                                 (m.sender?._id?.toString() === parentId && m.receiver?._id?.toString() === userId))
                              );
                            })
                            .map((m, index) => (
                                <div
                                key={`msg-${m._id}-${m.createdAt}-${index}`}
                                  className={`p-2 rounded ${m.sender?._id?.toString() === (coachId || user?._id)?.toString() ? 'bg-primary text-white align-self-end' : 'bg-light align-self-start'}`}
                                  style={{ maxWidth: '70%', wordBreak: 'break-word' }}
                                >
                                  {m.content}
                                  <small className="d-block text-muted">{new Date(m.createdAt).toLocaleString()}</small>
                                </div>
                            ))}
                        </div>
                        <div className="input-group mt-2">
                          <input
                            type="text"
                            className="form-control"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                          />
                          <button className="btn btn-primary" onClick={handleSendMessage}>
                            Send
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted">Coach ID not available</p>
                    )
                  ) : (
                    <p className="text-muted">Select a student to start chatting</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
          {/* Gamification */}
          {activeSection === 'gamification' && (
            <div>
              <h3>Rewards & Points</h3>
              <div className="card shadow">
                <div className="card-body">
                  <button className="btn btn-primary mb-3" data-bs-toggle="modal" data-bs-target="#rewardModal">
                    Launch New Reward
                  </button>
                  <h5>Program Rewards</h5>
                  <table className="table table-hover mb-4">
                    <thead>
                      <tr>
                        <th>Program</th>
                        <th>Reward</th>
                        <th>Points Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.rewards
                        .filter(r => r.program && r.coach)
                        .map(r => (
                          <tr key={r._id}>
                            <td>{r.program ? dashboardData.coach?.assignedPrograms.find(p => p._id === r.program.toString())?.name : 'Unknown'}</td>
                            <td>{r.reward}</td>
                            <td>{r.pointsRequired}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <h5>Student Points</h5>
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Points</th>
                        <th>Badges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.rewards
                        .filter(r => r.userId)
                        .map(r => {
                          const enrollment = dashboardData.enrollments.find(e => e.parent._id === r.userId.toString());
                          return (
                            <tr key={r._id}>
                              <td>{enrollment?.childName || 'Unknown'}</td>
                              <td>{r.points}</td>
                              <td>{r.badges.join(', ') || 'None'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Training Materials */}
          {activeSection === 'materials' && (
            <div>
              <h3>Training Materials</h3>
              <div className="card shadow">
                <div className="card-body">
                  <button className="btn btn-primary mb-3" data-bs-toggle="modal" data-bs-target="#materialModal">Upload New Material</button>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Program</th>
                        <th>Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.materials.map(material => (
                        <tr key={material._id}>
                          <td>{material.title}</td>
                          <td>{material.program.name}</td>
                          <td><a href={material.fileUrl} target="_blank" rel="noopener noreferrer">View</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {activeSection === 'progress' && (
            <div>
              <h3>Student Progress</h3>
              <div className="card shadow">
                <div className="card-body">
                  <div className="mb-3">
                    <select
                      className="form-control"
                      value={selectedStudentId || ''}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                      <option value="">Select Student</option>
                      {dashboardData.enrollments.map(e => (
                        <option key={e._id} value={e._id}>{e.childName} ({e.program.name})</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-primary mb-3" data-bs-toggle="modal" data-bs-target="#progressModal">Add Progress</button>
                  {progressData.labels.length > 0 ? (
                    <Line
                      data={progressData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'top' },
                          title: { display: true, text: 'Progress Timeline' }
                        },
                        scales: {
                          y: {
                            min: 0,
                            max: 100,
                            title: { display: true, text: 'Score' }
                          }
                        }
                      }}
                    />
                  ) : (
                    <p>Select a student to view progress</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attendance Section */}
          {activeSection === 'attendance' && (
            <div>
              <h3>Attendance Management</h3>
              
              {/* Step 1: Date Selection */}
              <div className="card shadow mb-4">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">Step 1: Select Date</h5>
                </div>
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <label className="form-label">Choose Date</label>
                  <input
                    type="date"
                        className="form-control"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                    <div className="col-md-6 text-end">
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowSessionSelection(true)}
                      >
                        Next: Choose Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Session Selection */}
              {showSessionSelection && (
                <div className="card shadow mb-4">
                  <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Step 2: Select Session</h5>
                    <button 
                      className="btn btn-light btn-sm"
                      onClick={() => setShowSessionSelection(false)}
                    >
                      Back
                    </button>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {SESSIONS.map(session => (
                        <div key={session.id} className="col-md-4 mb-3">
                          <div 
                            className={`card ${selectedSession === session.id ? 'border-primary' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setSelectedSession(session.id);
                              setShowStudentList(true);
                            }}
                          >
                            <div className="card-body text-center">
                              <h5 className="card-title">{session.name}</h5>
                              <p className="card-text text-muted">{session.timeRange}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Student List and Attendance Marking */}
              {showStudentList && selectedSession && (
                <div className="card shadow">
                  <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      Step 3: Mark Attendance for {SESSIONS.find(s => s.id === selectedSession)?.name} - {selectedDate}
                    </h5>
                    <button 
                      className="btn btn-light btn-sm"
                      onClick={() => {
                        setShowStudentList(false);
                        setSelectedSession('');
                        setAttendanceStatus({});
                      }}
                    >
                      Back
                    </button>
                  </div>
                  <div className="card-body">
                {dashboardData.coach?.assignedPrograms.map(program => {
                  const enrollmentsForProgram = dashboardData.enrollments.filter(e => e.program._id === program._id);
                      const programAttendance = dashboardData.attendance.filter(a => 
                        new Date(a.date).toISOString().split('T')[0] === selectedDate &&
                        a.session === selectedSession &&
                        enrollmentsForProgram.some(e => e._id === a.enrollment.toString())
                      );

                  return (
                        <div key={program._id} className="mb-4">
                          <h6 className="border-bottom pb-2">{program.name}</h6>
                          <div className="table-responsive">
                            <table className="table table-hover">
                              <thead>
                                <tr>
                                  <th>Student Name</th>
                                  <th>Previous Status</th>
                                  <th>Current Status</th>
                                  <th>Action</th>
                                  <th>History</th>
                                </tr>
                              </thead>
                              <tbody>
                            {enrollmentsForProgram.map(enrollment => {
                                  const existingAttendance = programAttendance.find(a => 
                                    a.enrollment.toString() === enrollment._id
                                  );
                                  const currentStatus = attendanceStatus[enrollment._id] || 
                                    (existingAttendance ? existingAttendance.status : 'absent');

                              return (
                                    <tr key={enrollment._id}>
                                      <td>{enrollment.childName}</td>
                                      <td>
                                        {existingAttendance && (
                                          <span className={`badge ${existingAttendance.status === 'present' ? 'bg-success' : 'bg-danger'}`}>
                                            {existingAttendance.status}
                                          </span>
                                        )}
                                      </td>
                                      <td>
                                        <span className={`badge ${currentStatus === 'present' ? 'bg-success' : 'bg-danger'}`}>
                                          {currentStatus}
                                        </span>
                                      </td>
                                      <td>
                                    <button
                                          className={`btn btn-sm ${currentStatus === 'present' ? 'btn-success' : 'btn-outline-success'} me-2`}
                                          onClick={() => toggleAttendanceStatus(enrollment._id)}
                                    >
                                          {currentStatus === 'present' ? 'Mark Absent' : 'Mark Present'}
                                    </button>
                                      </td>
                                      <td>
                                    <button
                                          className="btn btn-sm btn-info"
                                      onClick={() => fetchStudentAttendanceHistory(enrollment._id)}
                                    >
                                          View History
                                    </button>
                                      </td>
                                    </tr>
                              );
                            })}
                              </tbody>
                            </table>
                          </div>
                          <div className="d-flex justify-content-end mt-3">
                          <button
                              className="btn btn-primary"
                            onClick={() => handleAttendanceSubmit(program._id)}
                          >
                            Submit Attendance
                          </button>
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>
              )}

              {/* Attendance History Modal */}
              <div className="modal fade" id="attendanceHistoryModal" tabIndex="-1">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">Attendance History</h5>
                      <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                        onClick={() => setSelectedStudentAttendance(null)}
                      ></button>
                    </div>
                    <div className="modal-body">
                      {selectedStudentAttendance && selectedStudentAttendance.length > 0 ? (
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Session</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedStudentAttendance.map(a => (
                              <tr key={a._id}>
                                <td>{new Date(a.date).toLocaleDateString()}</td>
                                <td>
                                  {SESSIONS.find(s => s.id === a.session)?.name || a.session}
                                </td>
                                <td>
                                  <span className={`badge ${a.status === 'present' ? 'bg-success' : 'bg-danger'}`}>
                                    {a.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p>No attendance history available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modals */}
        <div className="modal fade" id="studentDetailsModal" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content shadow-lg rounded">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="fas fa-user-graduate me-2"></i> Student Details</h5>
                <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" onClick={() => setSelectedStudent(null)}></button>
              </div>
              <div className="modal-body p-4">
                {selectedStudent && (
                  <div className="container">
                    <div className="card mb-3 shadow-sm">
                      <div className="card-header bg-info text-white fw-bold"><i className="fas fa-book-reader me-2"></i> Enrollment Details</div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-8">
                            <p><strong>👦 Child Name:</strong> {selectedStudent.enrollment.childName}</p>
                            <p><strong>🏆 Program:</strong> {selectedStudent.enrollment.program.name}</p>
                            <p><strong>🏅 Sport:</strong> {selectedStudent.enrollment.program.sport}</p>
                            <p><strong>💰 Pricing:</strong> <span className="badge bg-success">${selectedStudent.enrollment.program.pricing}</span></p>
                            <p><strong>📅 Start Date:</strong> {new Date(selectedStudent.enrollment.program.startDate).toLocaleDateString()}</p>
                            <p><strong>🕒 Duration:</strong> {selectedStudent.enrollment.program.duration}</p>
                            <p><strong>🎯 Age Group:</strong> {selectedStudent.enrollment.program.ageGroup}</p>
                            <p><strong>💺 Seats Available:</strong> {selectedStudent.enrollment.program.seatsAvailable}</p>
                            <p><strong>👨‍👩‍👦 Parent:</strong> {selectedStudent.enrollment.parent.name} ({selectedStudent.enrollment.parent.email})</p>
                            <p><strong>⚡ Status:</strong> <span className={`badge ${selectedStudent.enrollment.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>{selectedStudent.enrollment.status}</span></p>
                            <p><strong>💳 Payment Status:</strong> {selectedStudent.enrollment.paymentStatus}</p>
                          </div>
                          <div className="col-md-4 text-center">
                            {selectedStudent.enrollment.parent.image ? (
                              <img
                                src={`http://localhost:5000${selectedStudent.enrollment.parent.image}`}
                                alt={`${selectedStudent.enrollment.parent.name}'s profile`}
                                className="img-fluid rounded-circle mb-2"
                                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center mb-2" style={{ width: '100px', height: '100px' }}>
                                <span className="text-white">No Image</span>
                              </div>
                            )}
                            <p><small>Parent Profile</small></p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="card mb-3 shadow-sm">
                          <div className="card-header bg-warning text-dark fw-bold"><i className="fas fa-chart-line me-2"></i> Progress</div>
                          <div className="card-body">
                            {selectedStudent.progress.length > 0 ? (
                              <ul className="list-group">
                                {selectedStudent.progress.map(p => (
                                  <li key={p._id} className="list-group-item">
                                    📅 {new Date(p.date).toLocaleDateString()} | 📊 Metrics: {p.metrics} | 📝 {p.notes || 'N/A'}
                                  </li>
                                ))}
                              </ul>
                            ) : <p className="text-muted">No progress recorded</p>}
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card mb-3 shadow-sm">
                          <div className="card-header bg-secondary text-white fw-bold"><i className="fas fa-calendar-check me-2"></i> Attendance</div>
                          <div className="card-body">
                            {selectedStudent.attendance.length > 0 ? (
                              <ul className="list-group">
                                {selectedStudent.attendance.map(a => (
                                  <li key={a._id} className="list-group-item">
                                    📅 {new Date(a.date).toLocaleDateString()} | 📌 Status: <span className={`badge ${a.status === 'present' ? 'bg-success' : 'bg-danger'}`}>{a.status}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : <p className="text-muted">No attendance recorded</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card mb-3 shadow-sm">
                      <div className="card-header bg-dark text-white fw-bold"><i className="fas fa-trophy me-2"></i> Rewards</div>
                      <div className="card-body">
                        {selectedStudent.gamification ? (
                          <p>🏅 Points: {selectedStudent.gamification.points} | 🎖️ Badges: {selectedStudent.gamification.badges.join(', ') || 'None'}</p>
                        ) : <p className="text-muted">No rewards earned</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        
          <div className="modal fade" id="scheduleModal" tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Set Schedule for {selectedProgram?.program.name}</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={() => setSelectedProgram(null)}></button>
                </div>
                <div className="modal-body">
                  {selectedProgram && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const startDate = new Date(e.target.startDate.value);
                      const duration = parseInt(e.target.duration.value);
                      const token = localStorage.getItem('token');
                      await axios.post('http://localhost:1000/api/coach/schedule', {
                        programId: selectedProgram.program._id,
                        duration,
                        schedule: selectedProgram.schedule.schedule || [],
                        startDate
                      }, { headers: { Authorization: `Bearer ${token}` } });
                      const response = await axios.get('http://localhost:1000/api/coach/dashboard', {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      setDashboardData(response.data);
                      setSelectedProgram(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, duration, startDate }
                      }));
                      document.getElementById('scheduleModal').querySelector('.btn-close').click();
                    }}>
                      <div className="mb-3">
                        <label htmlFor="startDate" className="form-label">Start Date</label>
                        <input
                          type="date"
                          className="form-control"
                          id="startDate"
                          name="startDate"
                          defaultValue={selectedProgram.schedule.startDate ? new Date(selectedProgram.schedule.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="duration" className="form-label">Duration (days)</label>
                        <select className="form-control" id="duration" name="duration" defaultValue={selectedProgram.schedule.duration || 10}>
                          <option value="10">10 Days</option>
                          <option value="20">20 Days</option>
                          <option value="30">30 Days</option>
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary">Set Duration</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modal fade" id="progressModal" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Track Progress</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div className="modal-body">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const enrollmentId = e.target.enrollment.value;
                    const date = e.target.date.value;
                    const metrics = e.target.metrics.value;
                    const notes = e.target.notes.value;
                    await axios.post('http://localhost:1000/api/coach/progress', { enrollmentId, date, metrics, notes }, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    const response = await axios.get('http://localhost:1000/api/coach/dashboard', {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                    setDashboardData(response.data);
                    document.getElementById('progressModal').querySelector('.btn-close').click();
                  }}>
                    <select className="form-control mb-3" name="enrollment" required>
                      <option value="">Select Student</option>
                      {dashboardData.enrollments.map(e => (
                        <option key={e._id} value={e._id}>{e.childName} ({e.program.name})</option>
                      ))}
                    </select>
                    <input type="date" className="form-control mb-3" name="date" required />
                    <input type="number" className="form-control mb-3" name="metrics" placeholder="e.g., 85" min="0" max="100" required />
                    <textarea className="form-control mb-3" name="notes" placeholder="Notes"></textarea>
                    <button type="submit" className="btn btn-primary">Submit</button>
                  </form>
                </div>
              </div>
            </div>
          </div>

        <div className="modal fade" id="messageModal" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Send Message</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const receiverId = e.target.receiver.value;
                  const content = e.target.content.value;
                  const enrollmentId = e.target.enrollment.value;
                  await axios.post('http://localhost:1000/api/coach/message', { receiverId, content, enrollmentId }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                  });
                  document.getElementById('messageModal').querySelector('.btn-close').click();
                }}>
                  <select className="form-control mb-3" name="receiver" required>
                    <option value="">Select Parent</option>
                    {dashboardData.enrollments.map((e, index) => (
                      <option key={`parent-${e.parent._id}-${index}-${Date.now()}`} value={e.parent._id}>{e.parent.name}</option>
                    ))}
                  </select>
                  <select className="form-control mb-3" name="enrollment" required>
                    <option value="">Select Enrollment</option>
                    {dashboardData.enrollments.map((e, index) => (
                      <option key={`enrollment-${e._id}-${index}-${Date.now()}`} value={e._id}>{e.childName} ({e.program.name})</option>
                    ))}
                  </select>
                  <textarea className="form-control mb-3" name="content" placeholder="Message content" required></textarea>
                  <button type="submit" className="btn btn-primary">Send</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="modal fade" id="notificationModal" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Send Notification</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const userId = e.target.user.value;
                  const type = e.target.type.value;
                  const message = e.target.message.value;
                  const details = e.target.details.value;
                  await axios.post('http://localhost:1000/api/coach/notification', { userId, type, message, details }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                  });
                  const response = await axios.get('http://localhost:1000/api/coach/dashboard', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                  });
                  setDashboardData(response.data);
                  document.getElementById('notificationModal').querySelector('.btn-close').click();
                }}>
                  <select className="form-control mb-3" name="user" required>
                    <option value="">Select Parent</option>
                    {dashboardData.enrollments.map(e => (
                      <option key={e.parent._id} value={e.parent._id}>{e.parent.name}</option>
                    ))}
                  </select>
                  <input type="text" className="form-control mb-3" name="type" placeholder="e.g., emergency" required />
                  <input type="text" className="form-control mb-3" name="message" placeholder="Notification message" required />
                  <textarea className="form-control mb-3" name="details" placeholder="Details (optional)"></textarea>
                  <button type="submit" className="btn btn-primary">Send</button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="modal fade" id="materialModal" tabIndex="-1">
          <div className="modal-dialog">
              <div className="modal-content">
              <div className="modal-header">
                  <h5 className="modal-title">Upload Training Material</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                  <form
                  onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData();
                      formData.append('programId', e.target.program.value);
                      formData.append('title', e.target.title.value);
                      formData.append('file', e.target.file.files[0]); // Add the PDF file

                      try {
                      await axios.post('http://localhost:1000/api/coach/training-material', formData, {
                          headers: {
                          Authorization: `Bearer ${localStorage.getItem('token')}`,
                          'Content-Type': 'multipart/form-data'
                          }
                      });
                      const response = await axios.get('http://localhost:1000/api/coach/dashboard', {
                          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      });
                      setDashboardData(response.data);
                      document.getElementById('materialModal').querySelector('.btn-close').click();
                      } catch (err) {
                      setError(err.response?.data?.message || 'Failed to upload material');
                      }
                  }}
                  >
                  <select className="form-control mb-3" name="program" required>
                      <option value="">Select Program</option>
                      {dashboardData.coach?.assignedPrograms.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                  </select>
                  <input type="text" className="form-control mb-3" name="title" placeholder="Material Title" required />
                  <input type="file" className="form-control mb-3" name="file" accept="application/pdf" required />
                  <button type="submit" className="btn btn-primary">Upload</button>
                  </form>
              </div>
              </div>
          </div>
      </div>
        
        <div className="modal fade" id="rewardModal" tabIndex="-1">
          <div className="modal-dialog">
              <div className="modal-content">
              <div className="modal-header">
                  <h5 className="modal-title">Launch New Reward</h5>
                  <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                  <form
                  onSubmit={async (e) => {
                      e.preventDefault();
                      const programId = e.target.program.value;
                      const reward = e.target.reward.value;
                      const pointsRequired = parseInt(e.target.pointsRequired.value);
                      await axios.post(
                      'http://localhost:1000/api/coach/reward',
                      { programId, reward, pointsRequired },
                      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                      );
                      const response = await axios.get('http://localhost:1000/api/coach/dashboard', {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                      });
                      setDashboardData(response.data);
                      document.getElementById('rewardModal').querySelector('.btn-close').click();
                  }}
                  >
                  <select className="form-control mb-3" name="program" required>
                      <option value="">Select Program</option>
                      {dashboardData.coach?.assignedPrograms.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                  </select>
                  <input type="text" className="form-control mb-3" name="reward" placeholder="Reward Name (e.g., Medal)" required />
                  <input
                      type="number"
                      className="form-control mb-3"
                      name="pointsRequired"
                      placeholder="Points Required"
                      required
                  />
                  <button type="submit" className="btn btn-primary">Launch Reward</button>
                  </form>
              </div>
              </div>
          </div>
      </div>
      

       {/* Attendance Report Modal */}
       <div 
         className="modal fade" 
         id="attendanceReportModal" 
         tabIndex="-1" 
         aria-labelledby="attendanceReportModalLabel"
         aria-modal="true"
         role="dialog"
         data-bs-backdrop="static"
       >
         <div className="modal-dialog modal-xl">
           <div className="modal-content">
             <div className="modal-header">
               <h5 className="modal-title" id="attendanceReportModalLabel">Attendance Report</h5>
               <button 
                 type="button" 
                 className="btn-close" 
                 data-bs-dismiss="modal" 
                 aria-label="Close"
                 onClick={() => {
                   const modal = window.bootstrap.Modal.getInstance(document.getElementById('attendanceReportModal'));
                   if (modal) {
                     modal.hide();
                   }
                   setSelectedStudentForReport(null);
                 }}
               ></button>
             </div>
             <div className="modal-body">
               {selectedStudentForReport && (
                 <AttendanceReport 
                   enrollmentId={selectedStudentForReport} 
                   onClose={() => {
                     const modal = window.bootstrap.Modal.getInstance(document.getElementById('attendanceReportModal'));
                     if (modal) {
                       modal.hide();
                     }
                     setSelectedStudentForReport(null);
                   }}
                 />
               )}
             </div>
           </div>
         </div>
       </div>
     </div>
      </div>



    );
  }

  export default CoachDashboard;