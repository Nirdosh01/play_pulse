import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Users, 
  Calendar, 
  FileText, 
  PlusCircle, 
  LogOut,
  MapPin,
  Trophy,
  Home
} from 'lucide-react';
import axios from 'axios';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

function OwnerPanel() {
  const navigate = useNavigate();

  // State declarations
  const [institute, setInstitute] = useState({
    name: '',
    address: '',
    facilities: '',
    sportsOffered: '',
    images: [],
    estdDate: '',
    rewards: '',
    branches: '',
    totalStaff: '',
    contactNumber: ''
  });
  const [coaches, setCoaches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [events, setEvents] = useState([]);
  const [newCoach, setNewCoach] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    qualification: '',
    experience: '',
    salary: '',
    contactNumber: '',
    updatePassword: false,
    image: null
  });
  const [newProgram, setNewProgram] = useState({
    name: '',
    sport: '',
    pricing: '',
    startDate: '',
    duration: '',
    ageGroup: '',
    schedule: '',
    description: '',
    seatsAvailable: '',
    assignedPrograms: []
  });
  const [newEvent, setNewEvent] = useState({
    name: '',
    place: '',
    type: '',
    date: '',
    description: '',
    status: 'upcoming',
    images: []
  });
  const [isEditingCoach, setIsEditingCoach] = useState(false);
  const [editCoachId, setEditCoachId] = useState(null);
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [editProgramId, setEditProgramId] = useState(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editEventId, setEditEventId] = useState(null);
  const [error, setError] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [enrollmentDetails, setEnrollmentDetails] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null); // For event enrollments modal
  const [eventEnrollments, setEventEnrollments] = useState([]); // Store event enrollments

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        const [instituteResponse, coachesResponse, programsResponse, enrollmentsResponse, eventsResponse] = await Promise.all([
          axios.get('http://localhost:1000/api/owner/profile', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:1000/api/owner/coaches', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:1000/api/owner/programs', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:1000/api/owner/enrollments', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:1000/api/owner/events', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setInstitute(instituteResponse.data || {});
        setCoaches(coachesResponse.data || []);
        setPrograms(programsResponse.data || []);
        setEnrollments(enrollmentsResponse.data || []);
        setEvents(eventsResponse.data || []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load data');
        console.error('Fetch data error:', err);
      }
    };
    fetchData();
  }, []);

  const handleInstituteSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('name', institute.name);
      formData.append('address', institute.address);
      formData.append('facilities', institute.facilities);
      formData.append('sportsOffered', institute.sportsOffered);
      formData.append('estdDate', institute.estdDate);
      formData.append('rewards', institute.rewards);
      formData.append('branches', institute.branches);
      formData.append('totalStaff', institute.totalStaff);
      formData.append('contactNumber', institute.contactNumber);

      const fileInput = document.querySelector('#instituteImages');
      if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(file => {
          formData.append('images', file);
        });
      } else {
        institute.images.forEach(image => formData.append('images', image));
      }

      const response = await axios.put('http://localhost:1000/api/owner/profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setInstitute(response.data);
      setError('');
      alert('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error('Institute update error:', err);
    }
  };

  const fetchEnrollmentDetails = async (enrollmentId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await axios.get(`http://localhost:1000/api/owner/enrollments/${enrollmentId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnrollmentDetails(response.data);
      const modal = new window.bootstrap.Modal(document.getElementById('enrollmentDetailsModal'));
      modal.show();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load enrollment details');
      console.error('Fetch enrollment details error:', err);
    }
  };

  const handleCoachSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      if (!isEditingCoach && (!newCoach.username || !newCoach.password)) {
        throw new Error('Username and password are required for new coaches');
      }

      const formData = new FormData();
      formData.append('name', newCoach.name);
      formData.append('email', newCoach.email);
      formData.append('qualification', newCoach.qualification);
      formData.append('experience', newCoach.experience);
      formData.append('salary', newCoach.salary);
      formData.append('contactNumber', newCoach.contactNumber);
      if (!isEditingCoach) {
        formData.append('username', newCoach.username);
        formData.append('password', newCoach.password);
      } else if (newCoach.updatePassword) {
        formData.append('password', newCoach.password);
      }
      if (newCoach.image && typeof newCoach.image !== 'string') {
        formData.append('image', newCoach.image);
      }

      let response;
      if (isEditingCoach) {
        response = await axios.put(
          `http://localhost:1000/api/owner/coaches/${editCoachId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        setCoaches(coaches.map(coach => coach._id === editCoachId ? response.data : coach));
      } else {
        response = await axios.post(
          'http://localhost:1000/api/owner/coaches',
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        setCoaches([...coaches, response.data]);
      }

      setNewCoach({
        name: '',
        email: '',
        username: '',
        password: '',
        qualification: '',
        experience: '',
        salary: '',
        contactNumber: '',
        updatePassword: false,
        image: null
      });
      setIsEditingCoach(false);
      setEditCoachId(null);
      setError('');
      document.getElementById('addCoachModal')?.querySelector('.btn-close')?.click();
    } catch (err) {
      setError(err.response?.data?.message || err.message || (isEditingCoach ? 'Failed to update coach' : 'Failed to add coach'));
      console.error('Coach submit error:', err);
    }
  };

  const handleEditCoach = (coachId) => {
    const coachToEdit = coaches.find(coach => coach._id === coachId);
    if (coachToEdit) {
      setNewCoach({
        name: coachToEdit.name || '',
        email: coachToEdit.email || '',
        username: coachToEdit.user?.username || '',
        password: '',
        qualification: coachToEdit.qualification || '',
        experience: coachToEdit.experience || '',
        salary: coachToEdit.salary || '',
        contactNumber: coachToEdit.contactNumber || '',
        updatePassword: false,
        image: coachToEdit.image || null
      });
      setIsEditingCoach(true);
      setEditCoachId(coachId);
      const modal = new window.bootstrap.Modal(document.getElementById('addCoachModal'));
      modal.show();
    } else {
      setError('Coach not found');
    }
  };

  const handleToggleStatus = async (coachId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await axios.put(
        `http://localhost:1000/api/owner/coaches/${coachId}/toggle-status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCoaches(coaches.map(coach => coach._id === coachId ? response.data : coach));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle coach status');
      console.error('Toggle status error:', err);
    }
  };

  const handleProgramSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const scheduleArray = newProgram.schedule.split(',').map(time => ({
        date: new Date(newProgram.startDate),
        time: time.trim()
      })).filter(s => s.time);

      const programData = {
        ...newProgram,
        schedule: scheduleArray,
        assignedPrograms: newProgram.assignedPrograms.map(coachId => ({ coach: coachId, role: 'Primary Coach' }))
      };

      let response;
      if (isEditingProgram) {
        response = await axios.put(
          `http://localhost:1000/api/owner/programs/${editProgramId}`,
          programData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPrograms(programs.map(p => p._id === editProgramId ? response.data : p));
      } else {
        response = await axios.post(
          'http://localhost:1000/api/owner/programs',
          programData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPrograms([...programs, response.data]);
      }

      setNewProgram({
        name: '',
        sport: '',
        pricing: '',
        startDate: '',
        duration: '',
        ageGroup: '',
        schedule: '',
        description: '',
        seatsAvailable: '',
        assignedPrograms: []
      });
      setIsEditingProgram(false);
      setEditProgramId(null);
      setError('');
      document.getElementById('addProgramModal')?.querySelector('.btn-close')?.click();
    } catch (err) {
      setError(err.response?.data?.message || (isEditingProgram ? 'Failed to update program' : 'Failed to add program'));
      console.error('Program submit error:', err);
    }
  };

  const handleEditProgram = (programId) => {
    const programToEdit = programs.find(p => p._id === programId);
    if (programToEdit) {
      setNewProgram({
        name: programToEdit.name || '',
        sport: programToEdit.sport || '',
        pricing: programToEdit.pricing || '',
        startDate: programToEdit.startDate ? programToEdit.startDate.split('T')[0] : '',
        duration: programToEdit.duration || '',
        ageGroup: programToEdit.ageGroup || '',
        schedule: programToEdit.schedule?.map(s => s.time).join(', ') || '',
        description: programToEdit.description || '',
        seatsAvailable: programToEdit.seatsAvailable || '',
        assignedPrograms: programToEdit.assignedPrograms?.map(ap => ap.coach?._id || ap.coach) || []
      });
      setIsEditingProgram(true);
      setEditProgramId(programId);
      const modal = new window.bootstrap.Modal(document.getElementById('addProgramModal'));
      modal.show();
    } else {
      setError('Program not found');
    }
  };

  const handleDeleteProgram = async (programId) => {
    if (!window.confirm('Are you sure you want to delete this program?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      await axios.delete(`http://localhost:1000/api/owner/programs/${programId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrograms(programs.filter(p => p._id !== programId));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete program');
      console.error('Delete program error:', err);
    }
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('name', newEvent.name);
      formData.append('place', newEvent.place);
      formData.append('type', newEvent.type);
      formData.append('date', newEvent.date);
      formData.append('description', newEvent.description);
      formData.append('status', newEvent.status);

      const fileInput = document.querySelector('#eventImages');
      if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(file => {
          formData.append('images', file);
        });
      } else if (isEditingEvent && newEvent.images && newEvent.images.length > 0) {
        formData.append('existingImages', JSON.stringify(newEvent.images));
      }

      let response;
      if (isEditingEvent) {
        response = await axios.put(
          `http://localhost:1000/api/owner/events/${editEventId}`,
          formData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        setEvents(events.map(e => e._id === editEventId ? response.data : e));
      } else {
        response = await axios.post(
          'http://localhost:1000/api/owner/events',
          formData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        setEvents([...events, response.data]);
      }

      setNewEvent({
        name: '',
        place: '',
        type: '',
        date: '',
        description: '',
        status: 'upcoming',
        images: []
      });
      setIsEditingEvent(false);
      setEditEventId(null);
      setError('');
      document.getElementById('addEventModal')?.querySelector('.btn-close')?.click();
    } catch (err) {
      setError(err.response?.data?.message || (isEditingEvent ? 'Failed to update event' : 'Failed to add event'));
      console.error('Event submit error:', err);
    }
  };

  const handleEditEvent = (eventId) => {
    const eventToEdit = events.find(e => e._id === eventId);
    if (eventToEdit) {
      setNewEvent({
        name: eventToEdit.name || '',
        place: eventToEdit.place || '',
        type: eventToEdit.type || '',
        date: eventToEdit.date ? eventToEdit.date.split('T')[0] : '',
        description: eventToEdit.description || '',
        status: eventToEdit.status || 'upcoming',
        images: eventToEdit.images || []
      });
      setIsEditingEvent(true);
      setEditEventId(eventId);
      const modal = new window.bootstrap.Modal(document.getElementById('addEventModal'));
      modal.show();
    } else {
      setError('Event not found');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
  
      await axios.delete(`http://localhost:1000/api/owner/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(events.filter(e => e._id !== eventId));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete event');
      console.error('Delete event error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const calendarEvents = programs.flatMap(p =>
    p.schedule?.map(s => ({
      title: p.name,
      start: new Date(s.date),
      end: new Date(s.date),
    })) || []
  );

  const fetchEventEnrollments = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await axios.get(`http://localhost:1000/api/owner/events/${eventId}/enrollments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEventEnrollments(response.data);
      const modal = new window.bootstrap.Modal(document.getElementById('eventEnrollmentsModal'));
      modal.show();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event enrollments');
      console.error('Fetch event enrollments error:', err);
    }
  };

  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar */}
      <div className="bg-dark text-white p-3" style={{ width: '250px', position: 'fixed', top: 0, bottom: 0, overflowY: 'auto' }}>
        <div className="d-flex align-items-center gap-2 mb-4">
          <Activity className="h-6 w-6 text-primary" />
          <h4 className="fw-bold">Owner Panel</h4>
        </div>
        <ul className="nav flex-column gap-2">
          <li className="nav-item">
            <a className="nav-link text-white d-flex align-items-center gap-2 active" href="#dashboard" data-bs-toggle="tab">
              <Home className="h-5 w-5" /> Dashboard
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link text-white d-flex align-items-center gap-2" href="#profile" data-bs-toggle="tab">
              <FileText className="h-5 w-5" /> Institute Profile
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link text-white d-flex align-items-center gap-2" href="#coaches" data-bs-toggle="tab">
              <Users className="h-5 w-5" /> Coach Management
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link text-white d-flex align-items-center gap-2" href="#programs" data-bs-toggle="tab">
              <Trophy className="h-5 w-5" /> Programs
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link text-white d-flex align-items-center gap-2" href="#events" data-bs-toggle="tab">
              <Trophy className="h-5 w-5" /> Events
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link text-white d-flex align-items-center gap-2" href="#enrollments" data-bs-toggle="tab">
              <MapPin className="h-5 w-5" /> Enrollments
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link text-white d-flex align-items-center gap-2" href="#calendar" data-bs-toggle="tab">
              <Calendar className="h-5 w-5" /> Training Calendar
            </a>
          </li>
          <li className="nav-item mt-auto">
            <button className="nav-link text-white d-flex align-items-center gap-2" onClick={handleLogout}>
              <LogOut className="h-5 w-5" /> Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="tab-content">
          {/* Dashboard */}
          <div className="tab-pane fade show active" id="dashboard">
            <h2 className="fw-bold fs-2 mb-4"> Owner Dashboard</h2>
            <div className="row g-4">
              <div className="col-md-4">
                <div className="card shadow text-center p-4">
                  <h5 className="fw-semibold">Institute</h5>
                  <p className="fs-4 fw-bold text-primary">{institute.name || 'Not Set'}</p>
                  <p className="text-muted">{institute.address || 'No address set'}</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow text-center p-4">
                  <h5 className="fw-semibold">Total Coaches</h5>
                  <p className="fs-4 fw-bold text-primary">{coaches.length}</p>
                  <p className="text-muted">Active coaches</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow text-center p-4">
                  <h5 className="fw-semibold">Programs</h5>
                  <p className="fs-4 fw-bold text-primary">{programs.length}</p>
                  <p className="text-muted">Active programs</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow text-center p-4">
                  <h5 className="fw-semibold">Enrollments</h5>
                  <p className="fs-4 fw-bold text-primary">{enrollments.length}</p>
                  <p className="text-muted">Total enrollments</p>
                </div>
              </div>
            </div>
          </div>

          {/* Institute Profile */}
          <div className="tab-pane fade" id="profile">
            <h2 className="fw-bold fs-2 mb-4">Institute Profile</h2>
            <div className="card shadow p-4 mb-4">
              <h5 className="card-title mb-3">Update Institute Details</h5>
              <form onSubmit={handleInstituteSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Institute Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={institute.name}
                        onChange={(e) => setInstitute({ ...institute, name: e.target.value })}
                        placeholder="Enter institute name"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Location Address <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={institute.address || ''}
                        onChange={(e) => setInstitute({ ...institute, address: e.target.value })}
                        placeholder="Enter full address"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Facilities <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={institute.facilities || ''}
                        onChange={(e) => setInstitute({ ...institute, facilities: e.target.value })}
                        placeholder="List facilities"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Sports Offered <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={institute.sportsOffered || ''}
                        onChange={(e) => setInstitute({ ...institute, sportsOffered: e.target.value })}
                        placeholder="e.g., Football, Basketball"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Contact Number <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={institute.contactNumber || ''}
                        onChange={(e) => setInstitute({ ...institute, contactNumber: e.target.value })}
                        placeholder="Enter contact number"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Established Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={institute.estdDate || ''}
                        onChange={(e) => setInstitute({ ...institute, estdDate: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Rewards</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={institute.rewards || ''}
                        onChange={(e) => setInstitute({ ...institute, rewards: e.target.value })}
                        placeholder="List rewards or achievements"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Branches</label>
                      <input
                        type="text"
                        className="form-control"
                        value={institute.branches || ''}
                        onChange={(e) => setInstitute({ ...institute, branches: e.target.value })}
                        placeholder="e.g., Kathmandu, Pokhara"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Total Staff</label>
                      <input
                        type="number"
                        className="form-control"
                        value={institute.totalStaff || ''}
                        onChange={(e) => setInstitute({ ...institute, totalStaff: e.target.value })}
                        placeholder="Enter total staff count"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Upload Images (Max 5)</label>
                      <input
                        type="file"
                        className="form-control"
                        id="instituteImages"
                        multiple
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          setInstitute({ ...institute, images: files });
                        }}
                      />
                      <small className="text-muted">Supported formats: JPG, PNG (max 5MB each)</small>
                    </div>
                    {institute.images && institute.images.length > 0 && (
                      <div className="mb-3">
                        <label className="form-label">Current Images:</label>
                        <div className="d-flex flex-wrap gap-2">
                          {institute.images.map((image, index) => (
                            <div key={index} className="position-relative">
                              {typeof image === 'string' ? (
                                <img
                                  src={`http://localhost:1000${image}`}
                                  alt={`Institute ${index}`}
                                  className="img-thumbnail"
                                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                />
                              ) : (
                                <img
                                  src={URL.createObjectURL(image)}
                                  alt={`Preview ${index}`}
                                  className="img-thumbnail"
                                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">Update Profile</button>
              </form>
            </div>
            <div className="card shadow">
              <div className="card-header">
                <h5 className="mb-0">Institute Details</h5>
              </div>
              <div className="card-body">
                {institute.name ? (
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Address</th>
                        <th>Facilities</th>
                        <th>Sports Offered</th>
                        <th>Estd Date</th>
                        <th>Rewards</th>
                        <th>Branches</th>
                        <th>Total Staff</th>
                        <th>Contact</th>
                        <th>Images</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{institute.name}</td>
                        <td>{institute.address || 'N/A'}</td>
                        <td>{institute.facilities || 'N/A'}</td>
                        <td>{institute.sportsOffered || 'N/A'}</td>
                        <td>{institute.estdDate ? new Date(institute.estdDate).toLocaleDateString() : 'N/A'}</td>
                        <td>{institute.rewards || 'N/A'}</td>
                        <td>{institute.branches || 'N/A'}</td>
                        <td>{institute.totalStaff || 'N/A'}</td>
                        <td>{institute.contactNumber || 'N/A'}</td>
                        <td>
                          {institute.images?.length > 0 ? (
                            <div className="d-flex flex-wrap gap-2">
                              {institute.images.map((image, index) => (
                                <img
                                  key={index}
                                  src={`http://localhost:1000${image}`}
                                  alt={`Institute ${index}`}
                                  className="img-thumbnail"
                                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                />
                              ))}
                            </div>
                          ) : (
                            'No images'
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted">No institute details available yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Coach Management */}
          <div className="tab-pane fade" id="coaches">
            <h2 className="fw-bold fs-2 mb-4">Coach Management</h2>
            <button
              className="btn btn-primary mb-3"
              data-bs-toggle="modal"
              data-bs-target="#addCoachModal"
              onClick={() => {
                setIsEditingCoach(false);
                setNewCoach({
                  name: '',
                  email: '',
                  username: '',
                  password: '',
                  qualification: '',
                  experience: '',
                  salary: '',
                  contactNumber: '',
                  updatePassword: false,
                  image: null
                });
                setEditCoachId(null);
              }}
            >
              <PlusCircle className="h-5 w-5 me-2" /> Add Coach
            </button>
            <div className="card shadow">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Qualification</th>
                    <th>Experience</th>
                    <th>Salary</th>
                    <th>Contact</th>
                    <th>Programs</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map(coach => (
                    <tr key={coach._id}>
                      <td>
                        {coach.image ? (
                          <img
                            src={`http://localhost:1000${coach.image}`}
                            alt={`${coach.name}'s profile`}
                            className="img-thumbnail"
                            style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                          />
                        ) : (
                          'No image'
                        )}
                      </td>
                      <td>{coach.name || 'N/A'}</td>
                      <td>{coach.email || 'N/A'}</td>
                      <td>{coach.qualification || 'N/A'}</td>
                      <td>{coach.experience || 'N/A'}</td>
                      <td>{coach.salary || 'N/A'}</td>
                      <td>{coach.contactNumber || 'N/A'}</td>
                      <td>{coach.assignedPrograms?.map(p => p.name).join(', ') || 'None'}</td>
                      <td>{coach.status || 'N/A'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => handleEditCoach(coach._id)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn btn-sm ${coach.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => handleToggleStatus(coach._id)}
                        >
                          {coach.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Programs */}
          <div className="tab-pane fade" id="programs">
            <h2 className="fw-bold fs-2 mb-4">Program Management</h2>
            <button
              className="btn btn-primary mb-3"
              data-bs-toggle="modal"
              data-bs-target="#addProgramModal"
              onClick={() => {
                setIsEditingProgram(false);
                setNewProgram({
                  name: '',
                  sport: '',
                  pricing: '',
                  startDate: '',
                  duration: '',
                  ageGroup: '',
                  schedule: '',
                  description: '',
                  seatsAvailable: '',
                  assignedPrograms: []
                });
                setEditProgramId(null);
              }}
            >
              <PlusCircle className="h-5 w-5 me-2" /> Add Program
            </button>
            <div className="card shadow">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Sport</th>
                    <th>Pricing</th>
                    <th>Start Date</th>
                    <th>Duration</th>
                    <th>Age Group</th>
                    <th>Seats Available</th>
                    <th>Coaches</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map(program => (
                    <tr key={program._id}>
                      <td>{program.name || 'N/A'}</td>
                      <td>{program.sport || 'N/A'}</td>
                      <td>{program.pricing || 'N/A'}</td>
                      <td>{program.startDate ? new Date(program.startDate).toLocaleDateString() : 'N/A'}</td>
                      <td>{program.duration || 'N/A'}</td>
                      <td>{program.ageGroup || 'N/A'}</td>
                      <td>{program.seatsAvailable || 'N/A'}</td>
                      <td>
                        {program.assignedPrograms?.length > 0
                          ? program.assignedPrograms.map(ap => ap.coach?.name || 'Unknown').join(', ')
                          : 'None'}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => handleEditProgram(program._id)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteProgram(program._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add/Edit Program Modal */}
            <div className="modal fade" id="addProgramModal" tabIndex="-1" aria-labelledby="addProgramModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="addProgramModalLabel">{isEditingProgram ? 'Edit Program' : 'Add New Program'}</h5>
                    <button
                      type="button"
                      className="btn-close"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                      onClick={() => {
                        setIsEditingProgram(false);
                        setNewProgram({
                          name: '',
                          sport: '',
                          pricing: '',
                          startDate: '',
                          duration: '',
                          ageGroup: '',
                          schedule: '',
                          description: '',
                          seatsAvailable: '',
                          assignedPrograms: []
                        });
                        setEditProgramId(null);
                      }}
                    />
                  </div>
                  <div className="modal-body">
                    <form onSubmit={handleProgramSubmit}>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Program Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={newProgram.name}
                            onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Sport <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={newProgram.sport}
                            onChange={(e) => setNewProgram({ ...newProgram, sport: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Pricing (NPR) <span className="text-danger">*</span></label>
                          <input
                            type="number"
                            className="form-control"
                            value={newProgram.pricing}
                            onChange={(e) => setNewProgram({ ...newProgram, pricing: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Start Date <span className="text-danger">*</span></label>
                          <input
                            type="date"
                            className="form-control"
                            value={newProgram.startDate}
                            onChange={(e) => setNewProgram({ ...newProgram, startDate: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Duration <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={newProgram.duration}
                            onChange={(e) => setNewProgram({ ...newProgram, duration: e.target.value })}
                            placeholder="e.g., 6 weeks"
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Age Group <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={newProgram.ageGroup}
                            onChange={(e) => setNewProgram({ ...newProgram, ageGroup: e.target.value })}
                            placeholder="e.g., 6-12"
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Seats Available <span className="text-danger">*</span></label>
                          <input
                            type="number"
                            className="form-control"
                            value={newProgram.seatsAvailable}
                            onChange={(e) => setNewProgram({ ...newProgram, seatsAvailable: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Schedule (comma-separated times)</label>
                          <input
                            type="text"
                            className="form-control"
                            value={newProgram.schedule}
                            onChange={(e) => setNewProgram({ ...newProgram, schedule: e.target.value })}
                            placeholder="e.g., 10:00 AM, 2:00 PM"
                          />
                        </div>
                        <div className="col-md-12 mb-3">
                          <label className="form-label">Description</label>
                          <textarea
                            className="form-control"
                            rows="3"
                            value={newProgram.description}
                            onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                          />
                        </div>
                        <div className="col-md-12 mb-3">
                          <label className="form-label">Assign Coaches</label>
                          <select
                            multiple
                            className="form-control"
                            value={newProgram.assignedPrograms}
                            onChange={(e) => setNewProgram({
                              ...newProgram,
                              assignedPrograms: Array.from(e.target.selectedOptions, option => option.value)
                            })}
                          >
                            {coaches.map(coach => (
                              <option key={coach._id} value={coach._id}>{coach.name || 'Unnamed Coach'}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary">
                        {isEditingProgram ? 'Update Program' : 'Add Program'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>

         {/* Events */}
         <div className="tab-pane fade" id="events">
            <h2 className="fw-bold fs-2 mb-4">Event Management</h2>
            <button
              className="btn btn-primary mb-3"
              data-bs-toggle="modal"
              data-bs-target="#addEventModal"
              onClick={() => {
                setIsEditingEvent(false);
                setNewEvent({
                  name: '',
                  place: '',
                  type: '',
                  date: '',
                  description: '',
                  status: 'upcoming',
                  images: []
                });
                setEditEventId(null);
              }}
            >
              <PlusCircle className="h-5 w-5 me-2" /> Add Event
            </button>
            <div className="card shadow">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Place</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Images</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event._id}>
                      <td>{event.name || 'N/A'}</td>
                      <td>{event.place || 'N/A'}</td>
                      <td>{event.type || 'N/A'}</td>
                      <td>{event.date ? new Date(event.date).toLocaleDateString() : 'N/A'}</td>
                      <td>{event.status || 'N/A'}</td>
                      <td>
                        {event.images?.length > 0 ? (
                          <div className="d-flex flex-wrap gap-2">
                            {event.images.map((image, index) => (
                              <img
                                key={index}
                                src={`http://localhost:1000${image}`}
                                alt={`Event ${index}`}
                                className="img-thumbnail"
                                style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                              />
                            ))}
                          </div>
                        ) : (
                          'No images'
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => handleEditEvent(event._id)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger me-2"
                          onClick={() => handleDeleteEvent(event._id)}
                        >
                          Delete
                        </button>
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => {
                            setSelectedEvent(event);
                            fetchEventEnrollments(event._id);
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add/Edit Event Modal unchanged */}
            <div className="modal fade" id="addEventModal" tabIndex="-1" aria-labelledby="addEventModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="addEventModalLabel">{isEditingEvent ? 'Edit Event' : 'Add New Event'}</h5>
                    <button
                      type="button"
                      className="btn-close"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                      onClick={() => {
                        setIsEditingEvent(false);
                        setNewEvent({
                          name: '',
                          place: '',
                          type: '',
                          date: '',
                          description: '',
                          status: 'upcoming',
                          images: []
                        });
                        setEditEventId(null);
                      }}
                    />
                  </div>
                  <div className="modal-body">
                    <form onSubmit={handleEventSubmit}>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Event Name <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={newEvent.name}
                            onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Place <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={newEvent.place}
                            onChange={(e) => setNewEvent({ ...newEvent, place: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Type <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={newEvent.type}
                            onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                            placeholder="e.g., Tournament, Workshop"
                            required
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Date <span className="text-danger">*</span></label>
                          <input
                            type="date"
                            className="form-control"
                            value={newEvent.date}
                            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-md-12 mb-3">
                          <label className="form-label">Description</label>
                          <textarea
                            className="form-control"
                            rows="3"
                            value={newEvent.description}
                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Status <span className="text-danger">*</span></label>
                          <select
                            className="form-control"
                            value={newEvent.status}
                            onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value })}
                            required
                          >
                            <option value="upcoming">Upcoming</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div className="col-md-12 mb-3">
                          <label className="form-label">Upload Images (Max 5)</label>
                          <input
                            type="file"
                            className="form-control"
                            id="eventImages"
                            multiple
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={(e) => {
                              const files = Array.from(e.target.files);
                              setNewEvent({ ...newEvent, images: files });
                            }}
                          />
                          <small className="text-muted">Supported formats: JPG, PNG (max 5MB each)</small>
                        </div>
                        {newEvent.images && newEvent.images.length > 0 && (
                          <div className="mb-3">
                            <label className="form-label">Current Images:</label>
                            <div className="d-flex flex-wrap gap-2">
                              {newEvent.images.map((image, index) => (
                                <div key={index} className="position-relative">
                                  {typeof image === 'string' ? (
                                    <img
                                      src={`http://localhost:1000${image}`}
                                      alt={`Event ${index}`}
                                      className="img-thumbnail"
                                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <img
                                      src={URL.createObjectURL(image)}
                                      alt={`Preview ${index}`}
                                      className="img-thumbnail"
                                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button type="submit" className="btn btn-primary">
                        {isEditingEvent ? 'Update Event' : 'Add Event'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Enrollments Modal */}
            <div className="modal fade" id="eventEnrollmentsModal" tabIndex="-1" aria-labelledby="eventEnrollmentsModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="eventEnrollmentsModalLabel">
                      Enrollments for {selectedEvent?.name}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                      onClick={() => {
                        setSelectedEvent(null);
                        setEventEnrollments([]);
                      }}
                    />
                  </div>
                  <div className="modal-body">
                    {eventEnrollments.length > 0 ? (
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Participant Name</th>
                            <th>Parent</th>
                            <th>Contact Number</th>
                            <th>Age</th>
                            <th>Status</th>
                            <th>Enrolled On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventEnrollments.map(enrollment => (
                            <tr key={enrollment._id}>
                              <td>{enrollment.name || 'N/A'}</td>
                              <td>{enrollment.parent ? `${enrollment.parent.name} (${enrollment.parent.email})` : 'N/A'}</td>
                              <td>{enrollment.contactNumber || 'N/A'}</td>
                              <td>{enrollment.age || 'N/A'}</td>
                              <td>{enrollment.status || 'N/A'}</td>
                              <td>{enrollment.createdAt ? new Date(enrollment.createdAt).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p>No enrollments found for this event.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enrollments */}
          <div className="tab-pane fade" id="enrollments">
            <h2 className="fw-bold fs-2 mb-4">Student Enrollments</h2>
            <div className="card shadow">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Child Name</th>
                    <th>Parent</th>
                    <th>Program</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map(enrollment => (
                    <tr key={enrollment._id}>
                      <td>{enrollment.childName || 'N/A'}</td>
                      <td>{enrollment.parent ? `${enrollment.parent.name} (${enrollment.parent.email})` : 'N/A'}</td>
                      <td>{enrollment.program?.name || 'N/A'}</td>
                      <td>{enrollment.paymentStatus || 'N/A'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            setSelectedEnrollment(enrollment);
                            fetchEnrollmentDetails(enrollment._id);
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enrollment Details Modal */}
            <div className="modal fade" id="enrollmentDetailsModal" tabIndex="-1" aria-labelledby="enrollmentDetailsModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title" id="enrollmentDetailsModalLabel">Enrollment Details</h5>
                    <button
                      type="button"
                      className="btn-close"
                      data-bs-dismiss="modal"
                      aria-label="Close"
                      onClick={() => {
                        setSelectedEnrollment(null);
                        setEnrollmentDetails(null);
                      }}
                    />
                  </div>
                  <div className="modal-body">
                    {enrollmentDetails ? (
                      <div>
                        <h3 style={{ marginBottom: '16px'}}>Basic Information</h3>
                        <p><strong>Child Name:</strong> {enrollmentDetails.childName || 'N/A'}</p>
                        <p><strong>Parent:</strong> {enrollmentDetails.parent ? `${enrollmentDetails.parent.name} (${enrollmentDetails.parent.email})` : 'N/A'}</p>
                        <p><strong>Program:</strong> {enrollmentDetails.program?.name || 'N/A'}</p>
                        <p><strong>Institute:</strong> {enrollmentDetails.institute?.name || 'N/A'}</p>
                        <p><strong>Payment Status:</strong> {enrollmentDetails.paymentStatus || 'N/A'}</p>
                        <p><strong>Enrolled On:</strong> {enrollmentDetails.createdAt ? new Date(enrollmentDetails.createdAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    ) : (
                      <p>Loading details...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Training Calendar */}
          <div className="tab-pane fade" id="calendar">
            <h2 className="fw-bold fs-2 mb-4">Training Calendar</h2>
            <div className="card shadow p-4">
              <BigCalendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500 }}
              />
            </div>
          </div>
        </div>

        {/* Add/Edit Coach Modal */}
        <div className="modal fade" id="addCoachModal" tabIndex="-1" aria-labelledby="addCoachModalLabel" aria-hidden="true">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="addCoachModalLabel">{isEditingCoach ? 'Edit Coach' : 'Add New Coach'}</h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  onClick={() => {
                    setIsEditingCoach(false);
                    setNewCoach({
                      name: '',
                      email: '',
                      username: '',
                      password: '',
                      qualification: '',
                      experience: '',
                      salary: '',
                      contactNumber: '',
                      updatePassword: false,
                      image: null
                    });
                    setEditCoachId(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <form onSubmit={handleCoachSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCoach.name}
                        onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        className="form-control"
                        value={newCoach.email}
                        onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Username <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCoach.username}
                        onChange={(e) => setNewCoach({ ...newCoach, username: e.target.value })}
                        required={!isEditingCoach}
                        disabled={isEditingCoach}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Password {isEditingCoach ? '' : <span className="text-danger">*</span>}</label>
                      {isEditingCoach ? (
                        <>
                          <div className="form-check mb-2">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={newCoach.updatePassword}
                              onChange={(e) => setNewCoach({ ...newCoach, updatePassword: e.target.checked })}
                            />
                            <label className="form-check-label">Update Password</label>
                          </div>
                          <input
                            type="password"
                            className="form-control"
                            value={newCoach.password}
                            onChange={(e) => setNewCoach({ ...newCoach, password: e.target.value })}
                            disabled={!newCoach.updatePassword}
                          />
                        </>
                      ) : (
                        <input
                          type="password"
                          className="form-control"
                          value={newCoach.password}
                          onChange={(e) => setNewCoach({ ...newCoach, password: e.target.value })}
                          required
                        />
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Qualification <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCoach.qualification}
                        onChange={(e) => setNewCoach({ ...newCoach, qualification: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Experience <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCoach.experience}
                        onChange={(e) => setNewCoach({ ...newCoach, experience: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Salary (NPR) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        value={newCoach.salary}
                        onChange={(e) => setNewCoach({ ...newCoach, salary: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Contact Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newCoach.contactNumber}
                        onChange={(e) => setNewCoach({ ...newCoach, contactNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Coach Image</label>
                      <input
                        type="file"
                        className="form-control"
                        id="coachImage"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => setNewCoach({ ...newCoach, image: e.target.files[0] })}
                      />
                      <small className="text-muted">Supported formats: JPG, PNG (max 5MB)</small>
                      {newCoach.image && (
                        <div className="mt-2">
                          <img
                            src={typeof newCoach.image === 'string' ? `http://localhost:1000${newCoach.image}` : URL.createObjectURL(newCoach.image)}
                            alt="Coach preview"
                            className="img-thumbnail"
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">
                    {isEditingCoach ? 'Update Coach' : 'Add Coach'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerPanel;