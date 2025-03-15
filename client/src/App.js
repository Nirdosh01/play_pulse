import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Calendar, 
  Medal, 
  Users, 
  Star,
  LogIn,
  UserPlus,
  MapPin,
  Trophy,
  MessageSquare,
  User
} from 'lucide-react';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import OwnerPanel from './pages/OwnerPanel';
import ParentPanel from './pages/ParentPanel';
import CoachPanel from './pages/CoachPanel';
import image1 from "./assets/img/carsoul-b.jpg";
import image2 from "./assets/img/carsoul.jpg";
import image3 from "./assets/img/carsoulc.jpg";

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const isLoggedIn = !!user; // True if user is logged in, false if not

  return (
    <div className="min-vh-100">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
        <div className="container px-4">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <Activity className="h-6 w-6 text-primary" />
            PlayPulse
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto gap-3">
              {!isLoggedIn ? (
                <>
                  <li className="nav-item">
                    <Link className="nav-link btn btn-outline-primary d-flex align-items-center gap-2" to="/login">
                      <LogIn className="h-4 w-4" />
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link btn btn-primary text-white d-flex align-items-center gap-2" to="/signup">
                      <UserPlus className="h-4 w-4" />
                      Sign Up
                    </Link>
                  </li>
                </>
              ) : (
                <li className="nav-item">
                  <button
                    className="nav-link btn btn-outline-primary d-flex align-items-center gap-2"
                    onClick={handleLogout}
                  >
                    <LogIn className="h-4 w-4" />
                    Logout
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/signup" element={<SignUpPage setUser={setUser} />} />
        <Route path="/owner" element={<OwnerPanel user={user} />} />
        <Route path="/parent" element={<ParentPanel user={user} />} />
        <Route path="/coach" element={<CoachPanel user={user} />} /> {/* Pass user prop here */}
      </Routes>
    </div>
  );
}

function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section id="heroCarousel" className="carousel slide" data-bs-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active position-relative">
            <img
              src={image2}
              alt="Kids playing sports"
              className="d-block w-100 vh-100 object-cover"
              style={{ filter: "brightness(50%)" }}
            />
            <div className="position-absolute top-50 start-50 translate-middle text-center text-white">
              <h1 className="fw-bold fs-2 mb-4">Connect Your Child with the Best Sports Institutes</h1>
              <p className="fs-5 mb-5">
                PlayPulse brings together parents and top sports institutes on one platform. 
                Find the perfect training program, track progress, and watch your child excel.
              </p>
              <div className="d-flex gap-4 justify-content-center">
                <Link to="/signup" className="btn btn-primary">Find Sports Programs</Link>
                <Link to="/signup" className="btn btn-outline-light">Register Institute</Link>
              </div>
            </div>
          </div>
          <div className="carousel-item position-relative">
            <img
              src={image1}
              alt="Soccer training"
              className="d-block w-100 vh-100 object-cover"
              style={{ filter: "brightness(50%)" }}
            />
            <div className="position-absolute top-50 start-50 translate-middle text-center text-white">
              <h1 className="fw-bold fs-2 mb-4">Boost Your Child's Athletic Potential</h1>
              <p className="fs-5 mb-5">
                Explore tailored training programs designed to enhance skills and performance.
              </p>
              <div className="d-flex gap-4 justify-content-center">
                <Link to="/signup" className="btn btn-primary">Find Sports Programs</Link>
                <Link to="/signup" className="btn btn-outline-light">Register Institute</Link>
              </div>
            </div>
          </div>
          <div className="carousel-item position-relative">
            <img
              src={image3}
              alt="Basketball practice"
              className="d-block w-100 vh-100 object-cover"
              style={{ filter: "brightness(50%)" }}
            />
            <div className="position-absolute top-50 start-50 translate-middle text-center text-white">
              <h1 className="fw-bold fs-2 mb-4">Join a Community of Champions</h1>
              <p className="fs-5 mb-5">
                Connect with expert coaches and like-minded athletes to achieve greatness.
              </p>
              <div className="d-flex gap-4 justify-content-center">
                <Link to="/signup" className="btn btn-primary">Find Sports Programs</Link>
                <Link to="/signup" className="btn btn-outline-light">Register Institute</Link>
              </div>
            </div>
          </div>
        </div>
        <button
          className="carousel-control-prev"
          type="button"
          data-bs-target="#heroCarousel"
          data-bs-slide="prev"
        >
          <span className="carousel-control-prev-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Previous</span>
        </button>
        <button
          className="carousel-control-next"
          type="button"
          data-bs-target="#heroCarousel"
          data-bs-slide="next"
        >
          <span className="carousel-control-next-icon" aria-hidden="true"></span>
          <span className="visually-hidden">Next</span>
        </button>
      </section>
      {/* Rest of the sections remain unchanged */}
      <section className="bg-white py-5">
        <div className="container px-4">
          <h2 className="text-center fw-bold fs-2 text-dark mb-5">
            Why Choose PlayPulse?
          </h2>
          <div className="row g-4">
            <FeatureCard 
              icon={<MapPin className="h-8 w-8 text-primary" />}
              title="Location-Based Search"
              description="Find the nearest sports institutes and programs based on your location."
            />
            <FeatureCard 
              icon={<Trophy className="h-8 w-8 text-primary" />}
              title="Gamification System"
              description="Keep children motivated with rewards, badges, and achievement tracking."
            />
            <FeatureCard 
              icon={<Star className="h-8 w-8 text-primary" />}
              title="Verified Institutes"
              description="All institutes are verified and rated by real parents."
            />
          </div>
        </div>
      </section>

      <section className="bg-primary text-white py-5">
        <div className="container px-4">
          <div className="row g-4 text-center">
            <StatCard number="500+" label="Sports Institutes" />
            <StatCard number="1000+" label="Qualified Coaches" />
            <StatCard number="10,000+" label="Active Students" />
            <StatCard number="50+" label="Sports Categories" />
          </div>
        </div>
      </section>

      <section className="py-5 bg-light">
        <div className="container px-4">
          <h2 className="text-center fw-bold fs-2 text-dark mb-5">
            Comprehensive Features
          </h2>
          <div className="row g-4">
            <DetailCard 
              icon={<Calendar className="h-6 w-6 text-primary" />}
              title="Advanced Calendar"
              description="Track sessions, events, and schedules all in one place."
            />
            <DetailCard 
              icon={<Users className="h-6 w-6 text-primary" />}
              title="Coach Management"
              description="Institutes can manage their coaches and assignments efficiently."
            />
            <DetailCard 
              icon={<MessageSquare className="h-6 w-6 text-primary" />}
              title="Parent-Coach Communication"
              description="Direct messaging between parents and coaches for better coordination."
            />
            <DetailCard 
              icon={<Medal className="h-6 w-6 text-primary" />}
              title="Progress Tracking"
              description="Monitor your child's development with detailed progress reports."
            />
            <DetailCard 
              icon={<Activity className="h-6 w-6 text-primary" />}
              title="Attendance System"
              description="Real-time tracking of attendance and session participation."
            />
            <DetailCard 
              icon={<Star className="h-6 w-6 text-primary" />}
              title="Reviews & Ratings"
              description="Make informed decisions with genuine parent reviews."
            />
          </div>
        </div>
      </section>

      <section className="py-5 bg-white">
        <div className="container px-4 text-center">
          <h2 className="fw-bold fs-2 text-dark mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted fs-5 mb-5 mx-auto" style={{ maxWidth: '600px' }}>
            Join PlayPulse today and give your child access to the best sports training programs in your area.
          </p>
          <div className="d-flex justify-content-center gap-4">
            <Link to="/signup" className="btn btn-primary">Sign Up Now</Link>
            <Link to="/login" className="btn btn-outline-primary">Learn More</Link>
          </div>
        </div>
      </section>

      <footer className="py-5">
        <div className="container px-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <span className="fs-4 fw-bold text-white">PlayPulse</span>
            </div>
            <div className="text-muted">
              © 2025 PlayPulse. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="col-md-4">
      <div className="text-center bg-white rounded shadow p-4">
        <div className="mb-3">{icon}</div>
        <h3 className="fw-semibold fs-5 mb-2">{title}</h3>
        <p className="text-muted">{description}</p>
      </div>
    </div>
  );
}

function StatCard({ number, label }) {
  return (
    <div className="col-md-3">
      <div className="fs-2 fw-bold mb-2">{number}</div>
      <div className="text-light">{label}</div>
    </div>
  );
}

function DetailCard({ icon, title, description }) {
  return (
    <div className="col-lg-4 col-md-6">
      <div className="bg-white rounded shadow p-4">
        <div className="d-flex align-items-center mb-3">
          {icon}
          <h3 className="fw-semibold fs-5 ms-3">{title}</h3>
        </div>
        <p className="text-muted">{description}</p>
      </div>
    </div>
  );
}

export default App;