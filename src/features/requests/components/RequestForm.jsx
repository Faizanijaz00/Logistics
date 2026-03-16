import { useState } from 'react';
import { Send, MapPin, Calendar, Clock, User, FileText } from 'lucide-react';

const reasonOptions = [
  { value: 'shopping', label: 'Shopping' },
  { value: 'lift', label: 'Transport' },
  { value: 'collection', label: 'Delivery' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

export function RequestForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    requester: '',
    reason: 'shopping',
    description: '',
    pickupLocation: '',
    destination: '',
    requestedDate: '',
    requestedTime: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.requester.trim()) newErrors.requester = 'Name is required';
    if (!formData.pickupLocation.trim())
      newErrors.pickupLocation = 'Pickup location is required';
    if (!formData.destination.trim())
      newErrors.destination = 'Destination is required';
    if (!formData.requestedDate) newErrors.requestedDate = 'Date is required';
    if (!formData.requestedTime) newErrors.requestedTime = 'Time is required';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      ...formData,
      pickupCoords: { lat: 51.505 + Math.random() * 0.01, lng: -0.09 + Math.random() * 0.01 },
      destinationCoords: { lat: 51.51 + Math.random() * 0.01, lng: -0.1 + Math.random() * 0.01 },
    });

    setFormData({
      requester: '',
      reason: 'shopping',
      description: '',
      pickupLocation: '',
      destination: '',
      requestedDate: '',
      requestedTime: '',
    });
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    color: '#000000',
    background: '#ffffff',
    border: '1px solid #c9cacb',
    borderRadius: '2px',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#323639',
    marginBottom: '8px',
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header - Porsche style black */}
      <div
        style={{
          padding: '24px',
          background: '#000000',
        }}
      >
        <h3 style={{ fontSize: '22px', fontWeight: '400', color: '#ffffff', margin: 0 }}>
          New Ride Request
        </h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
          Request a ride from the community
        </p>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>
            <User style={{ width: '16px', height: '16px', color: '#626669' }} />
            Your Name
          </label>
          <input
            type="text"
            name="requester"
            value={formData.requester}
            onChange={handleChange}
            placeholder="Enter your name"
            style={{
              ...inputStyle,
              borderColor: errors.requester ? '#c4001a' : '#c9cacb',
            }}
          />
          {errors.requester && (
            <p style={{ fontSize: '12px', color: '#c4001a', marginTop: '4px' }}>
              {errors.requester}
            </p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label style={labelStyle}>
            <FileText style={{ width: '16px', height: '16px', color: '#626669' }} />
            Reason for Request
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {reasonOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, reason: option.value }))}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '400',
                  background: formData.reason === option.value ? '#000000' : 'transparent',
                  color: formData.reason === option.value ? '#ffffff' : '#323639',
                  border: `1px solid ${formData.reason === option.value ? '#000000' : '#c9cacb'}`,
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ ...labelStyle }}>Description (Optional)</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            placeholder="Brief description of your request..."
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        {/* Locations */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              <MapPin style={{ width: '16px', height: '16px', color: '#018a16' }} />
              Pickup Location
            </label>
            <input
              type="text"
              name="pickupLocation"
              value={formData.pickupLocation}
              onChange={handleChange}
              placeholder="Where to pick you up"
              style={{
                ...inputStyle,
                borderColor: errors.pickupLocation ? '#c4001a' : '#c9cacb',
              }}
            />
            {errors.pickupLocation && (
              <p style={{ fontSize: '12px', color: '#c4001a', marginTop: '4px' }}>
                {errors.pickupLocation}
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>
              <MapPin style={{ width: '16px', height: '16px', color: '#c4001a' }} />
              Destination
            </label>
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="Where do you need to go"
              style={{
                ...inputStyle,
                borderColor: errors.destination ? '#c4001a' : '#c9cacb',
              }}
            />
            {errors.destination && (
              <p style={{ fontSize: '12px', color: '#c4001a', marginTop: '4px' }}>
                {errors.destination}
              </p>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              <Calendar style={{ width: '16px', height: '16px', color: '#626669' }} />
              Date
            </label>
            <input
              type="date"
              name="requestedDate"
              value={formData.requestedDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              style={{
                ...inputStyle,
                borderColor: errors.requestedDate ? '#c4001a' : '#c9cacb',
              }}
            />
            {errors.requestedDate && (
              <p style={{ fontSize: '12px', color: '#c4001a', marginTop: '4px' }}>
                {errors.requestedDate}
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>
              <Clock style={{ width: '16px', height: '16px', color: '#626669' }} />
              Time
            </label>
            <input
              type="time"
              name="requestedTime"
              value={formData.requestedTime}
              onChange={handleChange}
              style={{
                ...inputStyle,
                borderColor: errors.requestedTime ? '#c4001a' : '#c9cacb',
              }}
            />
            {errors.requestedTime && (
              <p style={{ fontSize: '12px', color: '#c4001a', marginTop: '4px' }}>
                {errors.requestedTime}
              </p>
            )}
          </div>
        </div>

        {/* Submit - Porsche style button */}
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '14px 32px',
            fontSize: '16px',
            fontWeight: '400',
            color: '#ffffff',
            background: '#000000',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 150ms ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#2a2a2a')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#000000')}
        >
          <Send style={{ width: '16px', height: '16px' }} />
          Submit Request
        </button>
      </div>
    </form>
  );
}
