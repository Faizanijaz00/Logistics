import React, { useState } from 'react';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';

// You might need to install lucide-react in your new project:
// npm install lucide-react

const FloatingCarCard = ({ 
  vehicle = {
    make: 'Mercedes',
    model: 'AMG GT',
    year: '2024',
    color: 'Silver',
    licensePlate: 'ABC 123',
    fuelType: 'Petrol',
    transmission: 'Auto',
    driveType: 'RWD',
    status: 'active'
  },
  imageUrl = 'https://i.imgur.com/Drj5Z1t.png', // Replace with your car image URL
  onSelect,
  onRemove,
  onEdit 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        cursor: 'pointer',
        transition: 'transform 0.4s cubic-bezier(.25,.1,.25,1)',
        transform: isHovered ? 'scale3d(1.03, 1.03, 1.03)' : 'scale3d(1, 1, 1)',
        paddingTop: '140px',
        width: '100%',
        maxWidth: '380px', // Optional: set a max-width for better presentation
        fontFamily: 'Inter, sans-serif' // Ensure you have a nice font loaded
      }}
      onClick={() => onSelect?.(vehicle)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit button - appears on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.(vehicle);
        }}
        style={{
          position: 'absolute',
          top: '150px',
          left: '10px',
          width: '36px',
          height: '36px',
          background: '#fff',
          border: 'none',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 10,
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#010205';
          e.currentTarget.querySelector('svg').style.color = '#fff';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#fff';
          e.currentTarget.querySelector('svg').style.color = '#010205';
        }}
      >
        <Pencil style={{ width: '16px', height: '16px', color: '#010205', transition: 'color 0.2s' }} />
      </button>

      {/* Remove button - appears on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove?.(vehicle.id);
        }}
        style={{
          position: 'absolute',
          top: '150px',
          right: '10px',
          width: '36px',
          height: '36px',
          background: '#fff',
          border: 'none',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 10,
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#c4001a';
          e.currentTarget.querySelector('svg').style.color = '#fff';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#fff';
          e.currentTarget.querySelector('svg').style.color = '#010205';
        }}
      >
        <Trash2 style={{ width: '16px', height: '16px', color: '#010205', transition: 'color 0.2s' }} />
      </button>

      {/* Car Image - Floating above the card */}
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '110%',
          height: '280px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 3,
          pointerEvents: 'none' // Let clicks pass through to card
        }}
      >
        <img
          src={imageUrl}
          alt={`${vehicle.make} ${vehicle.model}`}
          style={{
            width: '100%',
            maxWidth: '420px',
            maxHeight: '240px',
            objectFit: 'contain',
            transition: 'transform 0.4s cubic-bezier(.25,.1,.25,1)',
            filter: 'drop-shadow(0 30px 40px rgba(0, 0, 0, 0.35))',
            // THIS is the floating animation logic:
            transform: isHovered ? 'translateY(-50px) scale(1.02)' : 'translateY(-15px) scale(1)',
          }}
        />
      </div>

      {/* Car Info Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '4px',
          padding: '100px 30px 30px',
          boxShadow: vehicle.status === 'maintenance'
            ? '0 0 20px rgba(196, 0, 26, 0.5), 0 0 40px rgba(196, 0, 26, 0.3), 0 4px 20px rgba(0, 0, 0, 0.1)'
            : '0 4px 20px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          zIndex: 1,
          border: vehicle.status === 'maintenance' ? '2px solid #c4001a' : 'none',
        }}
      >
        <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#010205', marginBottom: '8px' }}>
          {vehicle.make} {vehicle.model}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#6b6b6b', marginBottom: '20px' }}>
          {vehicle.year} · {vehicle.color} · {vehicle.licensePlate}
        </div>

        {/* Specs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '20px',
            borderTop: '1px solid #eeeff2',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#010205' }}>
              {vehicle.fuelType || 'Diesel'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
              Fuel
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#010205' }}>
              {vehicle.transmission || 'Auto'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
              Trans
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#010205' }}>
              {vehicle.driveType?.replace('-Wheel Drive', 'WD') || 'RWD'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
              Drive
            </div>
          </div>
        </div>

        {/* Arrow CTA */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            right: '30px',
            width: '40px',
            height: '40px',
            background: '#010205',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateX(0)' : 'translateX(-10px)',
            transition: 'all 0.3s ease',
          }}
        >
          <ChevronRight style={{ width: '20px', height: '20px', color: '#ffffff' }} />
        </div>
      </div>
    </div>
  );
};

export default FloatingCarCard;
