'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '../../components/Appshell';
import { CalendarDays, Clock, MapPin, User, Plus, X, Rocket, Pencil, Trash2, Check, Lightbulb } from 'lucide-react';
import useResponsive from '../../lib/useResponsive';
import { C, G, S, P } from '../../lib/theme';
import { API_URL } from '../../lib/config';

async function recordActivityLog(message) {
  try {
    const existing = JSON.parse(localStorage.getItem('openserver_logs_v2') || '[]');
    existing.unshift({ id: Date.now(), message, timestamp: new Date().toISOString() });
    localStorage.setItem('openserver_logs_v2', JSON.stringify(existing.slice(0, 200)));
  } catch (e) {}

  try {
    const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
    const csrfToken = await tokenRes.text();

    await fetch(`${API_URL}/jsonapi/activity/activity`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        data: {
          type: 'activity--activity',
          attributes: {
            field_activity_message: message,
            field_activity_output: message
          }
        }
      })
    });
  } catch (err) {
    console.error('Failed to post activity to Drupal:', err);
  }
}

export default function EventsPage() {
  const { isMobile } = useResponsive();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null); // e.g. 29 or 30 or null for All

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('2026-07-29');
  const [newTime, setNewTime] = useState('09:30 PM');
  const [newDuration, setNewDuration] = useState('60 mins');
  const [newOrganizer, setNewOrganizer] = useState('Sarah Connor');
  const [newTag, setNewTag] = useState('HR Team');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('');

  const currentUser = {
    name: 'Sarah Connor',
    role: 'Super Admin',
    initials: 'SC',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  };

  const DEFAULT_EVENTS = [
    {
      id: 'evt-101',
      uuid: 'evt-101',
      title: 'Global Town Hall Q3',
      description: 'Join us for our quarterly all-hands meeting where we discuss Q3 achievements and Q4 goals.',
      location: 'Main Auditorium / Zoom',
      month: 'AUG',
      day: 15,
      dateString: 'AUG 15',
      fullDate: '2026-08-15',
      duration: '90 mins',
      time: '10:00 AM',
      organizer: 'Leadership Team',
      tag: 'Company Wide',
      attendees: 145,
      attendeeAvatars: ['AB', 'CD', 'EF'],
      going: false,
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'evt-102',
      uuid: 'evt-102',
      title: 'Design Team Weekly Sync',
      description: 'Weekly sync to review current sprints, share feedback on mocks, and align on UX patterns.',
      location: 'Creative Lab 4',
      month: 'AUG',
      day: 18,
      dateString: 'AUG 18',
      fullDate: '2026-08-18',
      duration: '45 mins',
      time: '02:00 PM',
      organizer: 'Design Lead',
      tag: 'Design',
      attendees: 12,
      attendeeAvatars: ['SC', 'MK', 'JL'],
      going: true,
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'evt-103',
      uuid: 'evt-103',
      title: 'Wellness Workshop: Mindfulness',
      description: 'A guided session on mindfulness and stress management for a healthier work-life balance.',
      location: 'Virtual Wellness Room',
      month: 'AUG',
      day: 22,
      dateString: 'AUG 22',
      fullDate: '2026-08-22',
      duration: '60 mins',
      time: '04:00 PM',
      organizer: 'HR Team',
      tag: 'Wellness',
      attendees: 34,
      attendeeAvatars: ['HR', 'JD', 'AM'],
      going: false,
      image: 'https://images.unsplash.com/photo-1558008258-3256797b43f3?w=800&auto=format&fit=crop&q=80'
    }
  ];

  const API_ENDPOINT = `${API_URL}/jsonapi/node/event`;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchEventsFromAPI = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINT);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map((item, idx) => {
            const rawDate = item.attributes?.field_date?.value || item.attributes?.field_event_date?.value || item.attributes?.created || new Date().toISOString();
            const dateObj = typeof rawDate === 'number' ? new Date(rawDate * 1000) : new Date(rawDate);
            const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const parsedMonth = monthNames[dateObj.getMonth()] || 'JUL';
            const parsedDay = dateObj.getDate() || (29 + (idx % 2));
            const yyyy = dateObj.getFullYear() || 2026;
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(parsedDay).padStart(2, '0');
            const fullDateStr = `${yyyy}-${mm}-${dd}`;

            return {
              id: item.id,
              uuid: item.id,
              title: item.attributes?.title || 'Community Gathering',
              description: item.attributes?.body?.value || item.attributes?.field_description?.value || 'Event details',
              location: item.attributes?.field_location || 'Online Virtual Room',
              month: parsedMonth,
              day: parsedDay,
              dateString: `${parsedMonth} ${parsedDay}`,
              fullDate: fullDateStr,
              duration: '60 mins',
              time: '09:00 PM',
              organizer: 'Team Member',
              tag: 'Community',
              attendees: 3,
              attendeeAvatars: ['SC', 'AD', 'TM'],
              going: true,
              image: item.attributes?.field_event_image || ''
            };
          });
          setEvents(mapped);
          setLoading(false);
          return;
        }
      }
    } catch (e) { }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('openserver_events_calendar_v4');
        if (saved) {
          const parsed = JSON.parse(saved).filter(evt => evt.id !== 'evt-101' && evt.id !== 'evt-102' && evt.id !== 'evt-103');
          setEvents(parsed);
          setLoading(false);
          return;
        }
      } catch (err) { }
    }

    setEvents(DEFAULT_EVENTS);
    setLoading(false);
  };

  useEffect(() => {
    fetchEventsFromAPI();
  }, []);

  const saveEventsState = (updatedList) => {
    setEvents(updatedList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('openserver_events_calendar_v4', JSON.stringify(updatedList));
      } catch (e) { }
    }
  };

  const handleToggleGoing = (eventId) => {
    const updated = events.map((evt) => {
      if (evt.id === eventId) {
        const isGoingNow = !evt.going;
        const newCount = isGoingNow ? evt.attendees + 1 : Math.max(1, evt.attendees - 1);
        showToast(isGoingNow ? '✓ RSVP Confirmed: You are attending!' : 'RSVP Cancelled');
        return { ...evt, going: isGoingNow, attendees: newCount };
      }
      return evt;
    });
    saveEventsState(updated);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setNewImage(uploadEvent.target.result);
        showToast(`✓ Image "${file.name}" uploaded!`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateEventSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const eventImageFinal = newImage.trim() || '';

    const payload = {
      data: {
        type: 'node--event',
        attributes: {
          title: newTitle.trim(),
          body: { value: newDescription.trim() || 'Community Event Details' },
          field_location: newLocation.trim() || 'Online',
          field_event_image: eventImageFinal
        }
      }
    };

    let createdId = 'evt-' + Date.now();

    try {
      const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
      const csrfToken = await tokenRes.text();

      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.id) createdId = json.data.id;
        showToast('POST Request Success: Event created in backend!');
      } else {
        showToast('New Event Scheduled Successfully!');
      }
    } catch (err) {
      showToast('New Event Scheduled Successfully!');
    }
    recordActivityLog(`New event created: "${newTitle.trim()}"`);

    const [year, monthStr, dayStr] = (newDate || '2026-07-29').split('-');
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const parsedMonth = monthNames[parseInt(monthStr, 10) - 1] || 'JUL';
    const parsedDay = parseInt(dayStr, 10) || 29;

    const createdEvent = {
      id: createdId,
      uuid: createdId,
      title: newTitle.trim(),
      month: parsedMonth,
      day: parsedDay,
      dateString: `${parsedMonth} ${parsedDay}`,
      fullDate: newDate || '2026-07-29',
      duration: newDuration || '60 mins',
      time: newTime || '09:00 PM',
      location: newLocation.trim() || 'Virtual Room',
      organizer: newOrganizer.trim() || currentUser.name,
      tag: newTag,
      description: newDescription.trim() || 'Community event meeting.',
      attendees: 1,
      attendeeAvatars: ['SC'],
      going: true,
      image: eventImageFinal
    };

    const updated = [createdEvent, ...events];
    saveEventsState(updated);

    setNewTitle('');
    setNewLocation('');
    setNewDescription('');
    setNewImage('');
    setShowCreateModal(false);
  };

  const handleUpdateEvent = async (eventObj) => {
    const updatedTitle = prompt('Edit Event Title:', eventObj.title);
    if (!updatedTitle || updatedTitle.trim() === '') return;

    const uuid = eventObj.uuid || eventObj.id;
    const patchPayload = {
      data: {
        type: 'node--event',
        id: uuid,
        attributes: {
          title: updatedTitle.trim()
        }
      }
    };

    try {
      const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
      const csrfToken = await tokenRes.text();

      const res = await fetch(`${API_ENDPOINT}/${uuid}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(patchPayload)
      });
      if (res.ok) {
        showToast('Event updated in backend!');
      } else {
        showToast('Event title updated!');
      }
    } catch (err) {
      showToast('Event title updated!');
    }

    const updated = events.map((item) => item.id === eventObj.id ? { ...item, title: updatedTitle.trim() } : item);
    saveEventsState(updated);
  };

  const handleDeleteEvent = async (uuid) => {
    if (!confirm('Are you sure you want to delete this scheduled event?')) return;
    const evtTitle = events.find(e => e.id === uuid || e.uuid === uuid)?.title || uuid;
    try {
      const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
      const csrfToken = await tokenRes.text();

      const res = await fetch(`${API_ENDPOINT}/${uuid}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      showToast(res.ok ? 'Event removed!' : 'Event removed!');
    } catch (err) { showToast('Event removed!'); }
    recordActivityLog(`Event deleted: "${evtTitle}"`);
    const updated = events.filter((e) => e.id !== uuid && e.uuid !== uuid);
    saveEventsState(updated);
  };

  // Dynamic Calendar Widget Logic
  const calendarDisplayDate = events.length > 0 ? new Date(events[0].fullDate || Date.now()) : new Date();
  const calendarYear = calendarDisplayDate.getFullYear();
  const calendarMonthIndex = calendarDisplayDate.getMonth();
  const calendarMonthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][calendarMonthIndex];
  const daysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const highlightedDays = events
    .filter(evt => {
      const evtDate = new Date(evt.fullDate || Date.now());
      return evtDate.getMonth() === calendarMonthIndex && evtDate.getFullYear() === calendarYear;
    })
    .map(evt => evt.day);

  const filteredEvents = events.filter((evt) => {
    const matchesSearch = evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.organizer.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedCalendarDate !== null && evt.day !== selectedCalendarDate) return false;
    return true;
  });

  return (
    <AppShell>
      {toastMsg && <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: G.brand, color: '#fff', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', zIndex: 9999, boxShadow: S.glow }}>{toastMsg}</div>}

      <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Page Title Row & Schedule Event Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.heading, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                  Events Calendar
                </h1>
                <p style={{ fontSize: '13px', color: C.muted, margin: 0 }}>
                  RSVP to Town Halls, Department standups, and Wellness training sessions.
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(!showCreateModal)}
                style={{
                  ...P.btn,
                  padding: '10px 20px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{showCreateModal ? <><X size={14} /> Close Form</> : <><Plus size={16} /> Schedule Event</>}</span>
              </button>
            </div>

            {/* Modal / Form Drawer to Schedule Event */}
            {showCreateModal && (
              <form onSubmit={handleCreateEventSubmit} style={{ ...P.card, padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: C.heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarDays size={20} color="#07518a" /> Schedule a New Event
                </h2>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Event Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Global Town Hall Q3 2026"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Start Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 09:30 PM"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 60 mins"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Department / Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. HR Team / ENG Team"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Location / Room</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Conference Hall / Zoom"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Organizer Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Amanda Brooks"
                      value={newOrganizer}
                      onChange={(e) => setNewOrganizer(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Event Summary & Description</label>
                  <textarea
                    placeholder="Provide overview details..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                    style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Event Cover Image</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px dashed #a99fd0' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ fontSize: '13px', color: '#0f172a' }}
                    />
                    {newImage && (
                      <img src={newImage} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #a99fd0' }} />
                    )}
                  </div>
                </div>

                <button type="submit" style={{ ...P.btn, padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Rocket size={15} /> Schedule Event
                </button>
              </form>
            )}

            {/* 2-Column Content Grid: Left Events Stream, Right Calendar Widget */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: isMobile ? '16px' : '24px', alignItems: 'start' }}>

              {/* Left Column: Events Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: '800', color: C.heading, margin: 0 }}>
                    {selectedCalendarDate ? `Events for July ${selectedCalendarDate}, 2026` : 'All Upcoming Events'}
                  </h2>

                  {selectedCalendarDate !== null && (
                    <button
                      onClick={() => setSelectedCalendarDate(null)}
                      style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', padding: '4px 12px', fontSize: '11px', fontWeight: '700', color: '#07518a', cursor: 'pointer' }}
                    >
                      Clear Filter (Show All)
                    </button>
                  )}
                </div>

                {filteredEvents.length === 0 ? (
                  <div style={{ ...P.card, padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><CalendarDays size={40} color="#a99fd0" /></div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: C.heading, marginBottom: '4px' }}>No Events Scheduled</h3>
                    <p style={{ fontSize: '13px', color: C.muted }}>Select another date on the calendar or schedule a new event.</p>
                  </div>
                ) : (
                  filteredEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        ...P.card,
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        overflow: 'hidden',
                        transition: 'transform 0.2s ease, boxShadow 0.2s ease'
                      }}
                    >
                      {/* Left Vertical Purple Date Badge */}
                      <div style={{
                        width: isMobile ? '100%' : '84px',
                        background: G.hero,
                        color: '#ffffff',
                        display: 'flex',
                        flexDirection: isMobile ? 'row' : 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: isMobile ? '10px 16px' : '16px 8px',
                        flexShrink: 0,
                        gap: isMobile ? '8px' : 0
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', opacity: 0.9 }}>{evt.month}</span>
                        <span style={{ fontSize: '24px', fontWeight: '900', lineHeight: '1' }}>{evt.day}</span>
                      </div>

                      {/* Middle & Right Content */}
                      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>

                        {/* Title Row + Tag */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: C.heading, margin: 0 }}>{evt.title}</h3>
                            {evt.tag && (
                              <span style={{ fontSize: '10px', fontWeight: '800', color: C.primary, backgroundColor: C.primarySoft, padding: '2px 8px', borderRadius: '4px' }}>
                                {evt.tag}
                              </span>
                            )}
                          </div>

                          <p style={{ fontSize: '12px', color: C.muted, lineHeight: '1.5', margin: '0 0 10px 0' }}>
                            {evt.description}
                          </p>

                          {/* Meta Row: Duration, Time, Location, Organizer */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '11px', color: C.muted, fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={11} /> {evt.duration} | {evt.time}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={11} /> {evt.location}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={11} /> Organizer: <strong style={{ color: '#334155' }}>{evt.organizer}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Footer Row: Attendees + Going RSVP Button + Patch/Delete */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>

                          {/* Attendees Avatars */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', marginLeft: '4px' }}>
                              {(evt.attendeeAvatars || ['SC', 'AB']).slice(0, 3).map((initials, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    backgroundColor: idx === 0 ? '#10b981' : idx === 1 ? '#ef4444' : '#f59e0b',
                                    color: '#ffffff',
                                    fontSize: '9px',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid #ffffff',
                                    marginLeft: idx > 0 ? '-6px' : '0'
                                  }}
                                >
                                  {initials}
                                </div>
                              ))}
                            </div>
                            <span style={{ fontSize: '11px', color: C.muted, fontWeight: '600' }}>
                              {evt.attendees} attending
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleGoing(evt.id)}
                              style={{
                                backgroundColor: evt.going ? '#f8fafc' : G.brand,
                                color: evt.going ? '#0f172a' : '#ffffff',
                                border: evt.going ? '1px solid #a99fd0' : 'none',
                                borderRadius: '16px',
                                padding: '5px 14px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              {evt.going ? <><Check size={11} /> Going</> : <><Plus size={11} /> RSVP</>}
                            </button>

                            <button onClick={() => handleUpdateEvent(evt)} style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', padding: '5px 10px', fontSize: '10px', fontWeight: '700', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Pencil size={10} /> PATCH
                            </button>
                            <button onClick={() => handleDeleteEvent(evt.uuid || evt.id)} style={{ backgroundColor: '#fee2e2', border: 'none', borderRadius: '12px', padding: '5px 10px', fontSize: '10px', fontWeight: '700', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Trash2 size={10} /> DELETE
                            </button>
                          </div>

                        </div>

                      </div>

                      {/* Event Image Cover */}
                      {evt.image && (
                        <div style={{ width: isMobile ? '100%' : '160px', height: isMobile ? '140px' : '100%', flexShrink: 0, borderLeft: isMobile ? 'none' : `1px solid ${C.border}`, borderTop: isMobile ? `1px solid ${C.border}` : 'none', overflow: 'hidden' }}>
                          <img
                            src={evt.image}
                            alt={evt.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}

                    </div>
                  ))
                )}

              </div>

              {/* Right Column: Interactive Calendar Widget */}
              <div style={{ ...P.card, padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: C.heading, margin: 0 }}>{calendarMonthName} {calendarYear}</h3>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: C.faint }}>Interactive</span>
                </div>

                {/* Calendar Days Header (Sun - Sat) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: C.faint, marginBottom: '8px' }}>
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                  {/* Empty cells for start day offset */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {calendarDays.map((d) => {
                    const isEventDay = highlightedDays.includes(d);
                    const isSelected = selectedCalendarDate === d;

                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedCalendarDate(isSelected ? null : d)}
                        style={{
                          height: '32px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid #07518a' : isEventDay ? '1px solid C.border' : 'none',
                          backgroundColor: isSelected ? G.brand : isEventDay ? '#e2e8f0' : 'transparent',
                          color: isSelected ? '#ffffff' : isEventDay ? '#1e293b' : '#334155',
                          fontSize: '11px',
                          fontWeight: isEventDay || isSelected ? '800' : '600',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        <span>{d}</span>
                        {isEventDay && !isSelected && (
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#07518a', marginTop: '1px' }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Helper Legend */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '10px', color: C.muted, textAlign: 'center', lineHeight: '1.4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Lightbulb size={11} /> Click on dates highlighted in purple to view their scheduled occurrences.
                </div>
              </div>

            </div>

      </main>

      {/* Floating Action (+) Button */}
      <button onClick={() => setShowCreateModal(true)} aria-label="Schedule new event" style={{ position: 'fixed', bottom: isMobile ? '20px' : '28px', right: isMobile ? '20px' : '28px', width: isMobile ? '52px' : '48px', height: isMobile ? '52px' : '48px', borderRadius: '50%', background: G.brand, color: '#fff', border: 'none', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: S.glow, zIndex: 999 }}><Plus size={24} /></button>
    </AppShell>
  );
}
