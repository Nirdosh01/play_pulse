import React, { useState } from 'react';
import axios from 'axios';

const LocationSearch = () => {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [institutes, setInstitutes] = useState([]);

  const handleSearch = async () => {
    const res = await axios.get(`http://localhost:5000/api/institutes/search?lat=${lat}&lng=${lng}`);
    setInstitutes(res.data);
  };

  return (
    <div>
      <input type="text" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
      <input type="text" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
      <button onClick={handleSearch}>Search</button>
      <ul>
        {institutes.map(inst => <li key={inst._id}>{inst.name}</li>)}
      </ul>
    </div>
  );
};

export default LocationSearch;