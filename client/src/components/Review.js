import React, { useState } from 'react';
import axios from 'axios';

const Review = ({ instituteId }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const submitReview = async () => {
    await axios.post(`http://localhost:5000/api/institutes/${instituteId}/reviews`, { rating, comment });
    alert('Review submitted!');
  };

  return (
    <div>
      <input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
      <button onClick={submitReview}>Submit Review</button>
    </div>
  );
};

export default Review;