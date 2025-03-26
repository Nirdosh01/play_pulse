    import React, { useState, useEffect, useRef } from 'react';
    import { format } from 'date-fns';
    import { useMemo } from 'react';
    import { useNavigate, useLocation } from 'react-router-dom';
    import {
      Home,
      Search,
      Calendar,
      MessageSquare,
      User,
      Star,
      FileText,
      LogOut,
      Bell,
      Trophy,
      CreditCard,
      CheckCircle,
      XCircle,
      Award,
      Settings
    } from 'lucide-react';
    import axios from 'axios';
    import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
    import moment from 'moment';
    import 'react-big-calendar/lib/css/react-big-calendar.css';
    import { Bar } from 'react-chartjs-2';
    import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
    import AttendanceReport from '../components/AttendanceReport.js';

    ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
    const localizer = momentLocalizer(moment);

  

    function ParentPanel() {
      const navigate = useNavigate();
      const location = useLocation();
      const chatRef = useRef(null);
      const [institutes, setInstitutes] = useState([]);
      const [enrollments, setEnrollments] = useState([]);
      const [attendance, setAttendance] = useState({});
      const [progress, setProgress] = useState({});
      const [chatMessages, setChatMessages] = useState([]);
      const [notifications, setNotifications] = useState([]);
      const [materials, setMaterials] = useState({});
      const [reviews, setReviews] = useState({});
      const [gamification, setGamification] = useState({});
      const [newMessage, setNewMessage] = useState('');
      const [calendarEvents, setCalendarEvents] = useState([]);
      const [searchQuery, setSearchQuery] = useState({ location: '', sport: '' });
      const [showTimeline, setShowTimeline] = useState(false);
      const [error, setError] = useState('');
      const [selectedChat, setSelectedChat] = useState(null);
      const [ownerId, setOwnerId] = useState(null);
      const [selectedReviewProgram, setSelectedReviewProgram] = useState(null);
      const [newReview, setNewReview] = useState({ rating: '', comment: '', reviewId: null });
      const [paymentStatus, setPaymentStatus] = useState(null); // New state for payment feedback
      const [activeTab, setActiveTab] = useState('dashboard'); // New state for active tab
      const [selectedEnrollmentForReport, setSelectedEnrollmentForReport] = useState(null);
      const [events, setEvents] = useState([]); // New state for events
      const [selectedEvent, setSelectedEvent] = useState(null); // For modal
      const [eventEnrollmentData, setEventEnrollmentData] = useState({ name: '', contactNumber: '', age: '' }); // Form data
      const [profile, setProfile] = useState(null); // New state for profile
      const [profileForm, setProfileForm] = useState({ name: '', email: '', username: '', image: null }); // Form state

      useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!token || !storedUser || storedUser.role !== 'parent') {
          navigate('/login');
          return;
        }

        // Parse query params
        const params = new URLSearchParams(location.search);
        const payment = params.get('payment');
        const enrollmentId = params.get('enrollmentId');
        const tab = params.get('tab');

        if (payment) {
          setPaymentStatus(payment); // success, failed, or error
          setTimeout(() => setPaymentStatus(null), 1000); // Clear after 5 seconds
        }
        if (tab) {
          setActiveTab(tab); // Set active tab from query param
        }

        fetchInstitutes();
        fetchEnrollments();
        fetchNotifications();
        fetchOwnerId();
        fetchChatMessages();
        fetchEvents();
        fetchProfile();

        // Clean up URL params to avoid repeated triggers
        if (payment || tab) {
          navigate('/parent', { replace: true });
        }
      }, [navigate, location]);


      useEffect(() => {
        let messagePolling;
        if (selectedChat?.receiverId) {
          console.log('Starting polling for receiver:', selectedChat.receiverId);
          fetchChatMessages(); // Fetch immediately when chat is selected
          messagePolling = setInterval(() => fetchChatMessages(), 1000);
        }
        return () => {
          if (messagePolling) {
            console.log('Stopping polling');
            clearInterval(messagePolling);
          }
        };
      }, [selectedChat?.receiverId]);

      useEffect(() => {
        const loadCalendarEvents = async () => {
          const events = await fetchCalendarEvents();
          setCalendarEvents(events);
        };
        loadCalendarEvents();
      }, []);


      const handleInitiatePayment = async (enrollmentId, amount) => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(
            'http://localhost:1000/api/parent/initiate-payment',
            { enrollmentId, amount },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          window.location.href = response.data.paymentUrl; // Redirect to Khalti
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to initiate payment');
        }
      };
      

      const fetchOwnerId = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('http://localhost:1000/api/parent/owner', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setOwnerId(response.data._id);
        } catch (err) {
          console.error('Failed to fetch owner ID:', err);
          setError(err.response?.data?.message || 'Failed to load owner ID');
        }
      };

      const uniqueCoaches = useMemo(() => {
        const coaches = enrollments
          .filter(e => e.program && Array.isArray(e.program.assignedPrograms)) // Ensure program exists and assignedPrograms is an array
          .flatMap(e => 
            e.program.assignedPrograms.map(ap => ({
              _id: ap.coach?._id,
              name: ap.coach?.name || 'Unknown Coach',
              userId: ap.coach?.user // Use the User ID linked to the Coach
            }))
          )
          .filter((coach, index, self) => 
            coach.userId && self.findIndex(c => c.userId === coach.userId) === index
          );
        console.log('Unique Coaches:', coaches);
        return coaches;
      }, [enrollments]);


      const coachEnrollments = useMemo(() => {
        const map = {};
        enrollments.forEach(e => {
          e.program.assignedPrograms.forEach(ap => {
            if (ap.coach?.user) map[ap.coach.user] = e; // Map by userId
          });
        });
        return map;
      }, [enrollments]);

      useEffect(() => {
        const loadCalendarEvents = async () => {
          const events = await fetchCalendarEvents();
          setCalendarEvents(events);
        };
        loadCalendarEvents();
      }, []);


      const fetchInstitutes = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('http://localhost:1000/api/parent/institutes', {
            headers: { Authorization: `Bearer ${token}` },
            params: searchQuery
          });
          setInstitutes(response.data);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load institutes');
        }
      };

      

      const fetchEnrollments = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) throw new Error('No token found');
          const response = await axios.get('http://localhost:1000/api/parent/enrollments', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Fetched Enrollments:', response.data); // Debug here
          const validEnrollments = response.data.filter(e => e.program);
          setEnrollments(validEnrollments);
       
          validEnrollments.forEach(enrollment => {
            fetchAttendance(enrollment._id);
            fetchProgress(enrollment._id);
            if (enrollment.paymentStatus === 'completed') {
              fetchMaterials(enrollment.program._id);
            }
          });
        } catch (err) {
          console.error('Fetch Enrollments Error:', err);
          setError(err.response?.data?.message || 'Failed to load enrollments');
        }
      };

      const fetchAttendance = async (enrollmentId) => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`http://localhost:1000/api/parent/attendance/${enrollmentId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAttendance(prev => ({ ...prev, [enrollmentId]: response.data }));
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load attendance');
        }
      };

      const fetchProgress = async (enrollmentId) => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`http://localhost:1000/api/parent/progress/${enrollmentId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setProgress(prev => ({ ...prev, [enrollmentId]: response.data }));
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load progress');
        }
      };

      const fetchChatMessages = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('http://localhost:1000/api/parent/chat-messages', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Chat Messages received:', response.data);
          setChatMessages(response.data);
        } catch (err) {
          console.error('Fetch chat messages error:', err.response?.data || err.message);
          setError(err.response?.data?.message || 'Failed to load messages');
        }
      };

      const handleSendMessage = async (receiverId, enrollmentId) => {
        if (!newMessage.trim()) {
          setError('Message cannot be empty');
          return;
        }
        if (!receiverId) {
          setError('No recipient selected');
          return;
        }
        try {
          const token = localStorage.getItem('token');
          const senderId = JSON.parse(localStorage.getItem('user'))?.id;
          if (!token || !senderId) {
            throw new Error('Authentication required');
          }
          console.log('Sending message:', { senderId, receiverId, content: newMessage, enrollmentId });
          const response = await axios.post(
            'http://localhost:1000/api/parent/chat-message',
            { receiverId, content: newMessage, enrollmentId: enrollmentId || null },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('Message sent:', response.data);
          setNewMessage('');
          await fetchChatMessages();
          if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
        } catch (err) {
          console.error('Send message error:', err.response?.data || err.message);
          setError(err.response?.data?.message || 'Failed to send message');
        }
      };

      const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      };

      const fetchNotifications = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('http://localhost:1000/api/parent/notifications', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setNotifications(response.data);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load notifications');
        }
      };

      const fetchMaterials = async (programId) => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`http://localhost:1000/api/parent/materials/${programId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMaterials(prev => ({ ...prev, [programId]: response.data.materials })); // Store only the materials array
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load materials');
        }
      };

      const handleReview = async (programId, coachId, instituteId) => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setError('Authentication required. Please login again.');
            return;
          }
      
          // Validate inputs
          if (!newReview.rating || !newReview.comment) {
            setError('Please provide both a rating and comment');
            return;
          }
      
          const isUpdate = !!newReview.reviewId;
          const method = isUpdate ? 'put' : 'post';
          const url = isUpdate 
            ? `http://localhost:1000/api/parent/reviews/${newReview.reviewId}`
            : 'http://localhost:1000/api/parent/reviews';
      
          const response = await axios[method](
            url,
            {
              programId,
              coachId,
              instituteId,
              rating: Number(newReview.rating),
              comment: newReview.comment.trim()
            },
            { 
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              } 
            }
          );
      
          // Update local state immediately
          setReviews(prev => {
            const updatedReviews = { ...prev };
            const programReviews = updatedReviews[programId] || [];
            
            if (isUpdate) {
              updatedReviews[programId] = programReviews.map(r => 
                r._id === newReview.reviewId ? response.data : r
              );
            } else {
              updatedReviews[programId] = [...programReviews, response.data];
            }
            
            return updatedReviews;
          });
      
          // Reset form
          setNewReview({ rating: '', comment: '', reviewId: null });
          setError('');
          
          // Optional: Show success message
          alert(`Review ${isUpdate ? 'updated' : 'submitted'} successfully!`);
      
        } catch (err) {
          console.error('Review submission error:', err);
          setError(err.response?.data?.message || 'Failed to submit review. Please try again.');
        }
      };


      const fetchProgramReviews = async (programId) => {
        try {
          const token = localStorage.getItem('token');
          if (!token) throw new Error('No authentication token found');
          
          const response = await axios.get(
            `http://localhost:1000/api/parent/reviews/${programId}`,
            { 
              headers: { Authorization: `Bearer ${token}` }, // Fixed the missing closing brace
              params: { debug: true } // Optional debugging
            }
          );
          
          console.log('Fetched reviews:', response.data); // Debug log
          return response.data;
        } catch (err) {
          console.error('Failed to fetch reviews:', {
            error: err,
            response: err.response?.data,
            programId
          });
          setError(err.response?.data?.message || 'Failed to load reviews');
          return [];
        }
      };

      const handleEventClick = (event) => {
        // Customize this to show event details as needed
        console.log('Event clicked:', event);
        alert(`Event Details:
          Title: ${event.title}
          Type: ${event.type}
          Program: ${event.programName}
          Time: ${format(event.start, 'PPpp')} - ${format(event.end, 'PPpp')}`);
      };

      const fetchCalendarEvents = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) throw new Error('No token found');
          const response = await axios.get('http://localhost:1000/api/parent/calendar-events', {
            headers: { Authorization: `Bearer ${token}` }
          });
      
          const events = response.data
            .map(event => ({
              ...event,
              start: new Date(event.start), // Ensure valid Date object
              end: new Date(event.end),     // Ensure valid Date object
            }))
            .filter(event => {
              const startValid = event.start && !isNaN(event.start.getTime());
              const endValid = event.end && !isNaN(event.end.getTime());
              if (!startValid || !endValid) {
                console.warn('Invalid event received:', event);
                return false;
              }
              return true;
            });
      
          console.log('Fetched and validated calendar events:', events);
          return events;
        } catch (err) {
          console.error('Fetch calendar events error:', err.response?.data || err.message);
          setError(err.response?.data?.message || 'Failed to load calendar events');
          return [];
        }
      };

      const refreshCalendar = async () => {
        const events = await fetchCalendarEvents();
        setCalendarEvents(events);
      };

      const fetchEvents = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('http://localhost:1000/api/parent/events', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Fetched Events:', response.data);
          setEvents(response.data);
        } catch (err) {
          console.error('Error fetching events:', err);
          setError(err.response?.data?.message || 'Failed to load events');
        }
      };

      const handleEventEnroll = async () => {
        const { name, contactNumber, age } = eventEnrollmentData;
        if (!name || !contactNumber || !age) {
          setError('Please fill in all fields');
          return;
        }
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(
            'http://localhost:1000/api/parent/event-enroll',
            { eventId: selectedEvent._id, name, contactNumber, age: Number(age) },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('Event Enrollment Response:', response.data);
          setEventEnrollmentData({ name: '', contactNumber: '', age: '' });
          setSelectedEvent(null);
          fetchNotifications(); // Refresh notifications
          alert('Enrollment request submitted successfully!');
        } catch (err) {
          console.error('Error enrolling in event:', err);
          setError(err.response?.data?.message || 'Failed to enroll in event');
        }
      };

      const fetchProfile = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('http://localhost:1000/api/parent/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Fetched Profile:', response.data);
          setProfile(response.data);
          setProfileForm({
            name: response.data.name,
            email: response.data.email,
            username: response.data.username || '',
            image: null
          });
        } catch (err) {
          console.error('Error fetching profile:', err);
          setError(err.response?.data?.message || 'Failed to load profile');
        }
      };
    
      const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
          const token = localStorage.getItem('token');
          const formData = new FormData();
          formData.append('name', profileForm.name);
          formData.append('email', profileForm.email);
          formData.append('username', profileForm.username);
          if (profileForm.image) {
            formData.append('image', profileForm.image);
          }
    
          const response = await axios.put('http://localhost:1000/api/parent/profile', formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          console.log('Profile Updated:', response.data);
          setProfile(response.data);
          setError('');
          localStorage.setItem('user', JSON.stringify(response.data)); // Update local storage
          alert('Profile updated successfully!');
        } catch (err) {
          console.error('Error updating profile:', err);
          setError(err.response?.data?.message || 'Failed to update profile');
        }
      };


      // New function to open attendance report modal
  const openAttendanceReport = (enrollmentId) => {
    setSelectedEnrollmentForReport(enrollmentId);
    const modal = new window.bootstrap.Modal(document.getElementById('attendanceReportModal'));
    modal.show();
  };


      return (
        <div className="d-flex min-vh-100">
          {/* Sidebar */}
          <div className="bg-dark text-white p-3 " style={{ width: '250px', position: 'fixed', top: 0, bottom: 0, overflowY: 'auto' }}>
            <div style={{ paddingTop: '4rem' }} className="d-flex mb-2 items-center justify-center gap-2 pt-14 mt-8 ">
              <Home className="h-6  w-6 text-primary" />
              <h4 className="fw-bold">Parent Panel</h4>
            </div>
            <ul className="nav flex-column gap-2">
            {/* <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2 active" href="#dashboard" data-bs-toggle="tab">
                <Home className="h-6 w-6 text-primary" />
                <h4 className="fw-bold">Parent Panel</h4>
                </a>
              </li> */}
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2 active" href="#dashboard" data-bs-toggle="tab">
                  <Home className="h-5 w-5" /> Dashboard
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2" href="#institutes" data-bs-toggle="tab">
                  <Search className="h-5 w-5" /> Browse Institutes
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2" href="#enrollments" data-bs-toggle="tab">
                  <User className="h-5 w-5" /> Enrollments
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2" href="#attendance" data-bs-toggle="tab">
                  <Calendar className="h-5 w-5" /> Attendance
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2" href="#progress" data-bs-toggle="tab">
                  <Trophy className="h-5 w-5" /> Progress
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2" href="#messages" data-bs-toggle="tab">
                  <MessageSquare className="h-5 w-5" /> Messages
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2" href="#calendar" data-bs-toggle="tab">
                  <Calendar className="h-5 w-5" /> Training Calendar
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2" href="#materials" data-bs-toggle="tab">
                  <FileText className="h-5 w-5" /> Training Materials
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2" href="#reviews" data-bs-toggle="tab">
                  <Star className="h-5 w-5" /> Reviews
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-white d-flex align-items-center gap-2" href="#notifications" data-bs-toggle="tab">
                  <Bell className="h-5 w-5" /> Notifications
                </a>
              </li>
              <li className="nav-item">
              <a className="nav-link text-white d-flex align-items-center gap-2" href="#events" data-bs-toggle="tab">
                <Award className="h-5 w-5" /> Events
              </a>
            </li>
            <li className="nav-item">
            <a className="nav-link text-white d-flex align-items-center gap-2" href="#profile" data-bs-toggle="tab">
              <Settings className="h-5 w-5" /> Profile Management
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
                <h2 className="fw-bold fs-2 mb-4"> Parents Dashboard</h2>
                <div className="row g-4">
                  <div className="col-md-4">
                    <div className="card shadow text-center p-4">
                      <h5 className="fw-semibold">Enrollments</h5>
                      <p className="fs-4 fw-bold text-primary">{enrollments.length}</p>
                      <p className="text-muted">Active enrollments</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card shadow text-center p-4">
                      <h5 className="fw-semibold">Notifications</h5>
                      <p className="fs-4 fw-bold text-primary">{notifications.filter(n => !n.read).length}</p>
                      <p className="text-muted">Unread notifications</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card shadow text-center p-4">
                      <h5 className="fw-semibold">Upcoming Sessions</h5>
                      <p className="fs-4 fw-bold text-primary">{calendarEvents.length}</p>
                      <p className="text-muted">This month</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Browse Institutes */}
                <div className="tab-pane fade" id="institutes">
                  <h2 className="fw-bold fs-2 mb-4">Browse Institutes</h2>
                  <div className="card shadow p-4 mb-4">
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search by location"
                          value={searchQuery.location}
                          onChange={(e) => setSearchQuery({ ...searchQuery, location: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4 mb-3">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search by sport"
                          value={searchQuery.sport}
                          onChange={(e) => setSearchQuery({ ...searchQuery, sport: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4 mb-3">
                        <button className="btn btn-primary w-100" onClick={fetchInstitutes}>Search</button>
                      </div>
                    </div>
                  </div>
                  <div className="row g-4">
                    {institutes.length === 0 ? (
                      <div className="col-12">
                        <div className="alert alert-info">No institutes found matching your search criteria.</div>
                      </div>
                    ) : (
                      institutes.map(inst => (
                        <div key={inst._id} className="col-md-6">
                          <div className="card shadow h-100" style={{ overflow: 'hidden', borderRadius: '15px' }}>
                            <div className="row g-0 h-100">
                              {/* Left Half: Image */}
                              <div className="col-md-6">
                                {inst.images && inst.images.length > 0 ? (
                                  <img
                                    src={`http://localhost:1000${inst.images[0]}`}
                                    alt={`${inst.name} image`}
                                    className="img-fluid h-100 w-100"
                                    style={{ objectFit: 'cover', borderRadius: '15px 0 0 15px' }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      const parent = e.target.parentElement;
                                      const fallback = document.createElement('div');
                                      fallback.className = 'd-flex align-items-center justify-content-center h-100 w-100 bg-light';
                                      fallback.style.borderRadius = '15px 0 0 15px';
                                      fallback.innerHTML = '<span class="text-muted">No Image Available</span>';
                                      parent.appendChild(fallback);
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="d-flex align-items-center justify-content-center h-100 w-100 bg-light"
                                    style={{ borderRadius: '15px 0 0 15px' }}
                                  >
                                    <span className="text-muted">No Image Available</span>
                                  </div>
                                )}
                              </div>
                              {/* Right Half: Details and Button */}
                              <div className="col-md-6 d-flex flex-column p-4">
                                <h5 className="fw-bold mb-2">{inst.name}</h5>
                                <p className="mb-1"><strong>Address:</strong> {inst.address || 'N/A'}</p>
                                <p className="mb-1"><strong>Sports:</strong> {inst.sportsOffered || 'N/A'}</p>
                                <p className="mb-1"><strong>Facilities:</strong> {inst.facilities || 'N/A'}</p>
                                <p className="mb-3"><strong>Staff:</strong> {inst.staff || 'N/A'}</p>
                                <button
                                  className="btn btn-outline-primary mt-auto"
                                  data-bs-toggle="modal"
                                  data-bs-target={`#programModal-${inst._id}`}
                                >
                                  View Programs
                                </button>
                              </div>
                            </div>
                          </div>
                          {/* Program Modal (unchanged) */}
                          <div className="modal fade" id={`programModal-${inst._id}`} tabIndex="-1">
                            <div className="modal-dialog modal-lg">
                              <div className="modal-content">
                                <div className="modal-header">
                                  <h5 className="modal-title">Programs at {inst.name}</h5>
                                  <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div className="modal-body">
                                  <ProgramList instituteId={inst._id} onEnrollSuccess={fetchEnrollments} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

  {/* Enrollments */}
  <div className={`tab-pane fade ${activeTab === 'enrollments' ? 'show active' : ''}`} id="enrollments">
    <h2 className="fw-bold fs-2 mb-4">Enrollments</h2>
    <div className="card shadow">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Child Name</th>
            <th>Program</th>
            <th>Institute</th>
            <th>Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map(e => (
            <tr key={e._id}>
              <td>{e.childName}</td>
              <td>{e.program.name}</td>
              <td>{e.institute.name}</td>
              <td>{e.paymentStatus}</td>
              <td>
                <div className="d-flex gap-2">
                  {e.paymentStatus === 'pending' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleInitiatePayment(e._id, e.program.pricing)}
                    >
                      <CreditCard className="h-4 w-4 me-1" /> Pay NPR {e.program.pricing}
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-outline-info"
                    data-bs-toggle="modal"
                    data-bs-target={`#programDetailsModal-${e._id}`}
                  >
                    Details
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Program Details Modals */}
    {enrollments.map(e => (
      <div
        key={e._id}
        className="modal fade"
        id={`programDetailsModal-${e._id}`}
        tabIndex="-1"
        aria-labelledby={`programDetailsModalLabel-${e._id}`}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id={`programDetailsModalLabel-${e._id}`}>
                {e.program.name} Details
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <h6>Program Information</h6>
                  <p><strong>Sport:</strong> {e.program.sport || 'N/A'}</p>
                  <p><strong>Pricing:</strong> NPR {e.program.pricing}</p>
                  <p><strong>Start Date:</strong> {new Date(e.program.startDate).toLocaleDateString()}</p>
                  <p><strong>Duration:</strong> {e.program.duration || 'N/A'}</p>
                  <p><strong>Age Group:</strong> {e.program.ageGroup || 'N/A'}</p>
                  <p><strong>Total Seats Available:</strong> {e.program.seatsAvailable || 'N/A'}</p>
                  <p><strong>Description:</strong> {e.program.description || 'N/A'}</p>
                </div>
                <div className="col-md-6">
                  <h6>Coach Information</h6>
                  {e.program.assignedPrograms && e.program.assignedPrograms.length > 0 ? (
                    e.program.assignedPrograms.map(ap => (
                      <div key={ap.coach?._id || ap._id} className="mb-3">
                        {ap.coach?.image ? (
                          <img
                            src={`http://localhost:1000${ap.coach.image}`}
                            alt={`${ap.coach.name}'s profile`}
                            className="img-fluid rounded-circle mb-2"
                            style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const parent = e.target.parentElement;
                              const fallback = document.createElement('div');
                              fallback.className = 'd-flex align-items-center justify-content-center rounded-circle bg-light mb-2';
                              fallback.style.width = '80px';
                              fallback.style.height = '80px';
                              fallback.innerHTML = '<span class="text-muted">No Image</span>';
                              parent.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center mb-2 rounded-circle bg-light"
                            style={{ width: '80px', height: '80px' }}
                          >
                            <span className="text-muted">No Image</span>
                          </div>
                        )}
                        <p><strong>Name:</strong> {ap.coach?.name || 'N/A'}</p>
                        <p><strong>Qualification:</strong> {ap.coach?.qualification || 'N/A'}</p>
                        <p><strong>Experience:</strong> {ap.coach?.experience || 'N/A'}</p>
                        <p><strong>Achievements:</strong> {ap.coach?.achievements || 'N/A'}</p>
                      </div>
                    ))
                  ) : (
                    <p>No coach assigned yet.</p>
                  )}
                </div>
              </div>
              <h6 className="mt-4">Training Schedule</h6>
              {e.program.schedule && e.program.schedule.length > 0 ? (
                <ul className="list-group">
                  {e.program.schedule.map((s, idx) => (
                    <li key={idx} className="list-group-item">
                      {new Date(s.date).toLocaleDateString()} - {s.time || 'Time TBD'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No schedule available.</p>
              )}
              <h6 className="mt-4">Badges & Rewards</h6>
              {materials[e.program._id]?.length > 0 || progress[e._id]?.length > 0 ? (
                <div>
                  {progress[e._id]?.some(p => p.metrics >= 80) && (
                    <span className="badge bg-success me-2">High Performer</span>
                  )}
                  {attendance[e._id]?.filter(a => a.status === 'present').length >= 10 && (
                    <span className="badge bg-primary me-2">Consistent Attendance</span>
                  )}
                  {materials[e.program._id]?.length > 0 && (
                    <span className="badge bg-info">Training Material Access</span>
                  )}
                </div>
              ) : (
                <p>No badges earned yet.</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>

              {/* Attendance */}
              <div className="tab-pane fade" id="attendance">
                <h2 className="fw-bold fs-2 mb-4">Attendance Tracking</h2>
                {enrollments.length === 0 ? (
                  <div className="alert alert-info">No enrollments found. Enroll in a program to track attendance.</div>
                ) : (
                  <div className="row g-4">
                    {enrollments.map(e => (
                      <div key={e._id} className="col-md-4">
                        <div className="card shadow h-100" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                          <div className="card-header bg-primary text-white p-3">
                            <h5 className="mb-0">{e.childName} - {e.program.name}</h5>
                          </div>
                          <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                              <p><strong>Institute:</strong> {e.institute.name}</p>
                              <p><strong>Status:</strong> {e.status}</p>
                              <p><strong>Total Sessions:</strong> {(attendance[e._id] || []).length}</p>
                              <p><strong>Present:</strong> {(attendance[e._id] || []).filter(a => a.status === 'present').length}</p>
                            </div>
                            <div>
                              <button
                                className="btn btn-outline-primary mt-3 me-2"
                                data-bs-toggle="modal"
                                data-bs-target={`#attendanceModal-${e._id}`}
                                disabled={!attendance[e._id] || attendance[e._id].length === 0}
                              >
                                See Details
                              </button>
                              <button
                                className="btn btn-outline-success mt-3"
                                onClick={() => openAttendanceReport(e._id)}
                                disabled={!attendance[e._id] || attendance[e._id].length === 0}
                              >
                                View Report
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attendance Details Modals */}
                {enrollments.map(e => (
                  <div
                    key={e._id}
                    className="modal fade"
                    id={`attendanceModal-${e._id}`}
                    tabIndex="-1"
                    aria-labelledby={`attendanceModalLabel-${e._id}`}
                    aria-hidden="true"
                  >
                    <div className="modal-dialog modal-xl">
                      <div className="modal-content">
                        <div className="modal-header bg-primary text-white">
                          <h5 className="modal-title" id={`attendanceModalLabel-${e._id}`}>
                            Attendance History for {e.childName} - {e.program.name}
                          </h5>
                          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body p-4">
                          {attendance[e._id] && attendance[e._id].length > 0 ? (
                            <BigCalendar
                              localizer={localizer}
                              events={(attendance[e._id] || []).map(a => ({
                                title: a.status === 'present' ? 'Present' : 'Absent',
                                start: new Date(a.date),
                                end: new Date(a.date),
                                allDay: true,
                                resource: a.status
                              }))}
                              startAccessor="start"
                              endAccessor="end"
                              style={{ height: 500 }}
                              eventPropGetter={(event) => ({
                                style: {
                                  backgroundColor: event.resource === 'present' ? '#28a745' : '#dc3545',
                                  color: 'white',
                                  borderRadius: '5px',
                                  border: 'none'
                                }
                              })}
                              defaultView="month"
                              views={['month']}
                              toolbar={true}
                            />
                          ) : (
                            <div className="alert alert-warning">No attendance records available for this program.</div>
                          )}
                          {attendance[e._id] && attendance[e._id].length > 0 && (
                            <div className="mt-4">
                              <h6>Summary</h6>
                              <p><strong>Total Sessions:</strong> {attendance[e._id].length}</p>
                              <p><strong>Present:</strong> {attendance[e._id].filter(a => a.status === 'present').length}</p>
                              <p><strong>Absent:</strong> {attendance[e._id].filter(a => a.status === 'absent').length}</p>
                            </div>
                          )}
                        </div>
                        <div className="modal-footer">
                          <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="tab-pane fade" id="progress">
                <h2 className="fw-bold fs-2 mb-4">Progress Monitoring</h2>
                {enrollments.length === 0 ? (
                  <div className="alert alert-info">No enrollments found. Progress will appear once enrolled.</div>
                ) : (
                  <div className="row g-4">
                    {enrollments.map(e => {
                      const groupedProgress = (progress[e._id] || []).reduce((acc, p) => {
                        const date = new Date(p.date).toLocaleDateString();
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(p);
                        return acc;
                      }, {});

                      return (
                        <div key={e._id} className="col-md-6">
                          <div className="card shadow h-100" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                            <div className="card-header bg-primary text-white p-3">
                              <h5 className="mb-0">{e.childName} - {e.program.name}</h5>
                            </div>
                            <div className="card-body">
                              <div className="mb-4">
                                <h6>Progress Summary</h6>
                                <p><strong>Average Score:</strong> {progress[e._id]?.length > 0 ? (progress[e._id].reduce((sum, p) => sum + p.metrics, 0) / progress[e._id].length).toFixed(1) : 'N/A'}</p>
                                <p><strong>Coach:</strong> {progress[e._id]?.[0]?.coach?.name || 'N/A'}</p>
                              </div>
                              <button
                                className="btn btn-outline-primary mb-3"
                                onClick={() => setShowTimeline(!showTimeline)}
                              >
                                {showTimeline ? 'Hide Timeline' : 'View Timeline'}
                              </button>
                              {showTimeline && (
                                <div className="timeline mb-4">
                                  <h6>Progress Timeline</h6>
                                  {Object.keys(groupedProgress).length > 0 ? (
                                    Object.entries(groupedProgress).map(([date, entries]) => (
                                      <div key={date} className="timeline-group mb-4">
                                        <div className="timeline-date fw-bold mb-2">{date}</div>
                                        {entries.map((p, idx) => (
                                          <div key={p._id} className="timeline-item d-flex align-items-start mb-2">
                                            <div className="timeline-dot" style={{ backgroundColor: p.metrics >= 80 ? '#28a745' : p.metrics >= 50 ? '#ffc107' : '#dc3545' }}></div>
                                            <div className="timeline-content ms-3 p-2 rounded">
                                              <p className="mb-0"><strong>Score:</strong> {p.metrics} / 100</p>
                                              <p className="text-muted small mb-0">{p.notes || 'No notes'}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-muted">No progress recorded yet.</p>
                                  )}
                                </div>
                              )}
                              <h6>Progress Trend</h6>
                              <Bar
                                data={{
                                  labels: (progress[e._id] || []).map(p => new Date(p.date).toLocaleDateString()),
                                  datasets: [{
                                    label: 'Progress Score',
                                    data: (progress[e._id] || []).map(p => Number(p.metrics) || 0),
                                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 1
                                  }]
                                }}
                                options={{
                                  scales: {
                                    y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score' } },
                                    x: { title: { display: true, text: 'Date' } }
                                  },
                                  plugins: {
                                    legend: { display: true },
                                    tooltip: { enabled: true }
                                  }
                                }}
                                height={150}
                              />
                              <h6 className="mt-4">Assigned Rewards</h6>
                              {gamification[e._id]?.badges?.length > 0 ? (
                                <div className="d-flex flex-wrap gap-2">
                                  {gamification[e._id].badges.map((badge, idx) => (
                                    <span key={idx} className="badge bg-success">{badge}</span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted">No rewards earned yet.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="tab-pane fade" id="messages">
                <h2 className="fw-bold fs-2 mb-4">Messages</h2>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="card shadow" style={{ height: '70vh' }}>
                  <div className="card-body d-flex p-0">
                    <div className="col-4 border-end p-3" style={{ overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
                      <h5 className="fw-semibold mb-3">Conversations</h5>
                      {ownerId ? (
                        <div
                          className={`p-3 mb-2 border rounded ${
                            selectedChat?.receiverId === ownerId ? 'bg-primary text-white' : 'bg-white'
                          }`}
                          style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                          onClick={() => {
                            setSelectedChat({ receiverId: ownerId, name: 'Admin Owner', enrollmentId: null });
                            fetchChatMessages();
                          }}
                        >
                          <strong>Admin Owner</strong>
                          <small className="d-block text-muted">Platform Admin</small>
                        </div>
                      ) : (
                        <p className="text-muted">No Admin Owner available</p>
                      )}
                      {uniqueCoaches.length > 0 ? (
                        uniqueCoaches.map(coach => {
                          const enrollment = coachEnrollments[coach.userId];
                          return (
                            <div
                              key={coach.userId}
                              className={`p-3 mb-2 border rounded ${
                                selectedChat?.receiverId === coach.userId ? 'bg-primary text-white' : 'bg-white'
                              }`}
                              style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                              onClick={() => {
                                if (!coach.userId) {
                                  console.error('No valid userId for coach:', coach);
                                  setError('Cannot message this coach: No valid ID');
                                  return;
                                }
                                setSelectedChat({
                                  receiverId: coach.userId,
                                  name: coach.name,
                                  enrollmentId: enrollment?._id,
                                });
                                fetchChatMessages();
                              }}
                            >
                              <strong>{coach.name}</strong>
                              <small className="d-block">{enrollment?.program.name || 'Unknown Program'}</small>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-muted">No coaches available</p>
                      )}
                    </div>

                    <div className="col-8 p-0 d-flex flex-column">
                      {selectedChat ? (
                        <>
                          <div className="border-bottom p-3 bg-light d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{selectedChat.name}</strong>
                              <small className="d-block text-muted">
                                {selectedChat.enrollmentId
                                  ? enrollments.find(e => e._id === selectedChat.enrollmentId)?.program.name
                                  : 'General Chat'}
                              </small>
                            </div>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => setSelectedChat(null)}
                            >
                              Close
                            </button>
                          </div>

                          <div
                            className="p-3 flex-grow-1"
                            style={{ overflowY: 'auto', backgroundColor: '#fff' }}
                            ref={chatRef}
                          >
                            {Array.from(new Map(
                              chatMessages
                                .filter(m =>
                                  (m.sender._id.toString() === selectedChat.receiverId && m.receiver._id.toString() === JSON.parse(localStorage.getItem('user'))?.id) ||
                                  (m.receiver._id.toString() === selectedChat.receiverId && m.sender._id.toString() === JSON.parse(localStorage.getItem('user'))?.id)
                                )
                                .map(m => [`${m._id}-${m.createdAt}`, m])
                            ).values())
                              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                              .map(m => {
                                const isSender = m.sender._id.toString() === JSON.parse(localStorage.getItem('user'))?.id;
                                return (
                                  <div
                                    key={`${m._id}-${m.createdAt}`}
                                    className={`d-flex mb-3 ${isSender ? 'justify-content-end' : 'justify-content-start'}`}
                                  >
                                    <div
                                      className={`p-3 rounded shadow-sm ${isSender ? 'bg-primary text-white' : 'bg-light text-dark'}`}
                                      style={{ maxWidth: '60%' }}
                                    >
                                      <p className="mb-1">{m.content}</p>
                                      <small>{new Date(m.createdAt).toLocaleTimeString()}</small>
                                    </div>
                                  </div>
                                );
                              })}
                            {chatMessages.filter(m =>
                              (m.sender._id.toString() === selectedChat.receiverId && m.receiver._id.toString() === JSON.parse(localStorage.getItem('user'))?.id) ||
                              (m.receiver._id.toString() === selectedChat.receiverId && m.sender._id.toString() === JSON.parse(localStorage.getItem('user'))?.id)
                            ).length === 0 && (
                              <p className="text-muted text-center mt-5">No messages yet</p>
                            )}
                          </div>

                          <div className="p-3 border-top bg-light">
                            <div className="input-group">
                              <input
                                type="text"
                                className="form-control"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                onKeyPress={e => {
                                  if (e.key === 'Enter' && newMessage.trim()) {
                                    handleSendMessage(selectedChat.receiverId, selectedChat.enrollmentId);
                                  }
                                }}
                              />
                              <button
                                className="btn btn-primary"
                                onClick={() => handleSendMessage(selectedChat.receiverId, selectedChat.enrollmentId)}
                                disabled={!newMessage.trim()}
                              >
                                Send
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="d-flex align-items-center justify-content-center flex-grow-1">
                          <p className="text-muted fs-4">Select a conversation to start chatting</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              
              <div className="tab-pane fade" id="calendar">
                <h2 className="fw-bold fs-2 mb-4">Training Calendar</h2>
                <button className="btn btn-primary mb-3" onClick={refreshCalendar}>
                  Refresh Calendar
                </button>
                <div className="card shadow p-4">
                  <BigCalendar
                    localizer={localizer}
                    events={calendarEvents.map(event => ({
                      ...event,
                      title: event.title,
                      start: new Date(event.start),
                      end: new Date(event.end),
                      allDay: true,
                    }))}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 700 }}
                    views={['month']}
                    defaultView="month"
                    toolbar={true}
                    onSelectEvent={(event) => {
                      alert(`Schedule Details:\nDate: ${new Date(event.start).toLocaleDateString()}\nEvent: ${event.title}`);
                    }}
                    components={{
                      event: ({ event }) => (
                        <div title={event.title}>
                          <strong>{event.title}</strong>
                        </div>
                      ),
                      dateCellWrapper: ({ children, value }) => {
                        const hasEvents = calendarEvents.some(
                          event => new Date(event.start).toDateString() === value.toDateString()
                        );
                        return (
                          <div
                            style={{
                              backgroundColor: hasEvents ? '#d4edda' : 'transparent',
                              height: '100%',
                              padding: '2px',
                            }}
                          >
                            {children}
                          </div>
                        );
                      },
                    }}
                    eventPropGetter={(event) => ({
                      style: {
                        backgroundColor: '#38a169',
                        borderRadius: '4px',
                        opacity: 0.8,
                        color: 'white',
                        border: '0px',
                        padding: '2px 5px',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        marginBottom: '2px',
                      },
                    })}
                  />
                </div>
              </div>

              {/* Training Materials */}
              <div className="tab-pane fade" id="materials">
      <h2 className="fw-bold fs-2 mb-4">Training Materials</h2>
      {enrollments.filter(e => e.paymentStatus === 'completed').length === 0 ? (
        <div className="alert alert-info">
          No training materials available. Complete a payment for an enrollment to access materials.
        </div>
      ) : (
        enrollments.filter(e => e.paymentStatus === 'completed').map(e => (
          <div key={e._id} className="card shadow mb-4">
            <div className="card-header">
              <h5>{e.program.name}</h5>
            </div>
            <div className="card-body">
              {(materials[e.program._id] || []).length > 0 ? (
                materials[e.program._id].map(m => (
                  <div key={m._id} className="mb-2">
                    <a href={m.fileUrl} target="_blank" rel="noopener noreferrer">{m.title}</a>
                    <p><small>Uploaded by: {m.coach?.name || 'Unknown'}</small></p>
                  </div>
                ))
              ) : (
                <p className="text-muted">No materials available for this program yet.</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>

                
              <div className="tab-pane fade" id="reviews">
      <h2 className="fw-bold fs-2 mb-4">Program Reviews</h2>
      
      {/* Program Selection Dropdown */}
      <div className="card shadow mb-4">
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Select Program</label>
            <select 
              className="form-select"
              value={selectedReviewProgram?._id || ''}
              onChange={async (e) => {
                const selectedId = e.target.value;
                if (!selectedId) {
                  setSelectedReviewProgram(null);
                  return;
                }
                const selected = enrollments.find(en => en._id === selectedId);
                setSelectedReviewProgram(selected);
                setNewReview({ rating: '', comment: '', reviewId: null });
                
                if (selected) {
                  const programReviews = await fetchProgramReviews(selected.program._id);
                  setReviews(prev => ({
                    ...prev,
                    [selected.program._id]: programReviews
                  }));
                }
              }}
            >
              <option value="">-- Select a Program --</option>
              {enrollments.map(e => (
                <option key={e._id} value={e._id}>
                  {e.program.name} - {e.institute.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Review Content */}
      {selectedReviewProgram ? (
        <div className="card shadow">
          <div className="card-body">
            <h5 className="mb-3">Submit Review for {selectedReviewProgram.program.name}</h5>
            
            {/* Existing Reviews */}
    {reviews[selectedReviewProgram.program._id]?.length > 0 ? (
      <div className="mb-4">
        <h6>Your Previous Reviews:</h6>
        <div className="list-group">
          {reviews[selectedReviewProgram.program._id]?.map((r, index) => (
            <div key={`${r._id}-${index}`} className="list-group-item">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="d-flex align-items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={18} 
                        className={i < r.rating ? 'text-warning fill-warning' : 'text-muted'} 
                      />
                    ))}
                  </div>
                  <p className="mb-1">{r.comment}</p>
                  <small className="text-muted">
                    Reviewed on {new Date(r.createdAt).toLocaleDateString()}
                  </small>
                </div>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    setNewReview({
                      rating: r.rating,
                      comment: r.comment,
                      reviewId: r._id
                    });
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <p className="text-muted mb-4">No reviews yet for this program</p>
    )}


            {/* Review Form */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!selectedReviewProgram) return;
              handleReview(
                selectedReviewProgram.program._id,
                selectedReviewProgram.program.assignedPrograms[0]?.coach?._id,
                selectedReviewProgram.institute._id // Add this line
              );
            }}>
              <div className="mb-3">
                <label className="form-label">Rating</label>
                <div className="d-flex align-items-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className="btn p-0 me-1"
                      onClick={() => setNewReview({...newReview, rating: star})}
                    >
                      <Star 
                        size={28} 
                        className={star <= newReview.rating ? 'text-warning fill-warning' : 'text-muted'} 
                      />
                    </button>
                  ))}
                  <span className="ms-2">{newReview.rating}/5</span>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="form-label">Your Review</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={newReview.comment}
                  onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                  placeholder="Share your experience with this program..."
                  required
                />
              </div>
              
              <div className="d-flex justify-content-end gap-2">
                {newReview.reviewId && (
                  <button 
                    type="button" 
                    className="btn btn-outline-danger"
                    onClick={() => setNewReview({ rating: '', comment: '', reviewId: null })}
                  >
                    Cancel Edit
                  </button>
                )}
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!newReview.rating || !newReview.comment}
                >
                  {newReview.reviewId ? 'Update Review' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="card shadow">
          <div className="card-body text-center py-5">
            <FileText className="h-8 w-8 text-muted mb-3" />
            <h5>No Program Selected</h5>
            <p className="text-muted">Please select a program from the dropdown to view or submit reviews</p>
          </div>
        </div>
      )}
    </div>


    {/* Events Tab */}
    <div className="tab-pane fade" id="events">
            <h2 className="fw-bold fs-2 mb-4">Upcoming Events</h2>
            <div className="row g-4">
              {events.length === 0 ? (
                <div className="col-12">
                  <div className="alert alert-info">No upcoming events found.</div>
                </div>
              ) : (
                events.map(event => (
                  <div key={event._id} className="col-md-4">
                    <div className="card shadow h-100" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                      {event.images && event.images.length > 0 ? (
                        <img
                          src={`http://localhost:1000${event.images[0]}`}
                          alt={`${event.name} image`}
                          className="card-img-top"
                          style={{ height: '200px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            const fallback = document.createElement('div');
                            fallback.className = 'd-flex align-items-center justify-content-center bg-light';
                            fallback.style.height = '200px';
                            fallback.innerHTML = '<span class="text-muted">No Image Available</span>';
                            parent.appendChild(fallback);
                          }}
                        />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center bg-light"
                          style={{ height: '200px' }}
                        >
                          <span className="text-muted">No Image Available</span>
                        </div>
                      )}
                      <div className="card-body d-flex flex-column">
                        <h5 className="card-title fw-bold">{event.name}</h5>
                        <p className="card-text"><strong>Institute:</strong> {event.institute.name}</p>
                        <p className="card-text"><strong>Place:</strong> {event.place}</p>
                        <p className="card-text"><strong>Type:</strong> {event.type}</p>
                        <p className="card-text"><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                        <p className="card-text"><strong>Description:</strong> {event.description || 'N/A'}</p>
                        <button
                          className="btn btn-primary mt-auto"
                          data-bs-toggle="modal"
                          data-bs-target="#eventEnrollModal"
                          onClick={() => setSelectedEvent(event)}
                        >
                          Enroll
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Event Enrollment Modal */}
        <div className="modal fade" id="eventEnrollModal" tabIndex="-1" aria-labelledby="eventEnrollModalLabel" aria-hidden="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="eventEnrollModalLabel">
                  Enroll in {selectedEvent?.name}
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Participant Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={eventEnrollmentData.name}
                    onChange={(e) => setEventEnrollmentData({ ...eventEnrollmentData, name: e.target.value })}
                    placeholder="Enter participant name"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Contact Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={eventEnrollmentData.contactNumber}
                    onChange={(e) => setEventEnrollmentData({ ...eventEnrollmentData, contactNumber: e.target.value })}
                    placeholder="Enter contact number"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-control"
                    value={eventEnrollmentData.age}
                    onChange={(e) => setEventEnrollmentData({ ...eventEnrollmentData, age: e.target.value })}
                    placeholder="Enter age"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  data-bs-dismiss="modal"
                  onClick={handleEventEnroll}
                >
                  Submit Enrollment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Management Tab */}
        <div className="tab-pane fade" id="profile">
            <h2 className="fw-bold fs-2 mb-4">Profile Management</h2>
            {profile ? (
              <div className="card shadow p-4">
                <form onSubmit={handleProfileUpdate}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Username</label>
                        <input
                          type="text"
                          className="form-control"
                          value={profileForm.username}
                          onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-6 text-center">
                      <div className="mb-3">
                        <label className="form-label">Profile Image</label>
                        {profile.image ? (
                          <img
                            src={`http://localhost:1000${profile.image}`}
                            alt="Profile"
                            className="rounded-circle mb-2"
                            style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const parent = e.target.parentElement;
                              const fallback = document.createElement('div');
                              fallback.className = 'd-flex align-items-center justify-content-center rounded-circle bg-light mb-2';
                              fallback.style.width = '150px';
                              fallback.style.height = '150px';
                              fallback.innerHTML = '<span class="text-muted">No Image</span>';
                              parent.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center rounded-circle bg-light mb-2"
                            style={{ width: '150px', height: '150px' }}
                          >
                            <span className="text-muted">No Image</span>
                          </div>
                        )}
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={(e) => setProfileForm({ ...profileForm, image: e.target.files[0] })}
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">Update Profile</button>
                </form>
              </div>
            ) : (
              <div className="alert alert-info">Loading profile...</div>
            )}
          </div>
      

              {/* Notifications */}
              <div className="tab-pane fade" id="notifications">
                <h2 className="fw-bold fs-2 mb-4">Notifications</h2>
                <div className="card shadow">
                  <ul className="list-group list-group-flush">
                    {notifications.map(n => (
                      <li key={n._id} className={`list-group-item ${n.read ? 'text-muted' : ''}`}>
                        <strong>{n.type.toUpperCase()}:</strong> {n.message}
                        {n.details && <p><small>{n.details}</small></p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>


        {/* Attendance Report Modal */}
      <div className="modal fade" id="attendanceReportModal" tabIndex="-1">
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">Attendance Report</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                onClick={() => setSelectedEnrollmentForReport(null)}
              ></button>
            </div>
            <div className="modal-body p-0">
              {selectedEnrollmentForReport && (
                <AttendanceReport 
                  enrollmentId={selectedEnrollmentForReport} 
                  onClose={() => {
                    document.getElementById('attendanceReportModal').querySelector('.btn-close').click();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

        

    function ProgramList({ instituteId, onEnrollSuccess }) {
      const [programs, setPrograms] = useState([]);
      const [selectedProgram, setSelectedProgram] = useState(null);
      const [childName, setChildName] = useState('');
      const [enrollmentId, setEnrollmentId] = useState(null);
      const [showPayment, setShowPayment] = useState(false);

      useEffect(() => {
        const fetchPrograms = async () => {
          try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:1000/api/parent/programs/${instituteId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setPrograms(response.data);
          } catch (err) {
            console.error('Error fetching programs:', err);
          }
        };
        fetchPrograms();
      }, [instituteId]);

      const handleProgramSelect = (program) => {
        setSelectedProgram(program === selectedProgram ? null : program);
        setShowPayment(false);
        setEnrollmentId(null);
      };

      const handleEnroll = async (programId) => {
        if (!childName) {
          alert("Please enter your child's name");
          return;
        }
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post('http://localhost:1000/api/parent/enroll', { childName, programId }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setEnrollmentId(response.data._id);
          setShowPayment(true);
        } catch (err) {
          alert(err.response?.data?.message || 'Failed to initiate enrollment');
        }
      };

      const handlePayment = async (program) => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.post(
            'http://localhost:1000/api/parent/initiate-payment',
            { enrollmentId, amount: program.pricing },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          window.location.href = response.data.paymentUrl; // Redirect to Khalti payment page
        } catch (err) {
          alert(err.response?.data?.message || 'Failed to initiate payment');
        }
      };

      return (
        <div>
          <h6>Available Programs</h6>
          {programs.length === 0 ? (
            <p>No programs available for this institute.</p>
          ) : (
            programs.map(p => (
              <div key={p._id} className="card mb-3">
                <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => handleProgramSelect(p)}>
                  <h6>{p.name} - NPR {p.pricing}</h6>
                </div>
                {selectedProgram && selectedProgram._id === p._id && (
                  <div className="card-body">
                    <p><strong>Sport:</strong> {p.sport}</p>
                    <p><strong>Institute:</strong> {p.institute.name}</p>
                    {/* ... other program details unchanged ... */}
                    {!showPayment ? (
                      <div className="mt-3">
                        <input
                          type="text"
                          className="form-control mb-2"
                          placeholder="Enter child name"
                          value={childName}
                          onChange={(e) => setChildName(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={() => handleEnroll(p._id)}>
                          Enroll
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <p><strong>Amount to Pay:</strong> NPR {p.pricing}</p>
                        <button className="btn btn-success" onClick={() => handlePayment(p)}>
                          Pay with Khalti
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
              </div>
      );
    }

    export default ParentPanel;