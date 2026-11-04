import React,{useEffect,useMemo,useRef,useState} from 'react';

const STORAGE='acl-roomgrid-18rooms-v1';
const rooms=['A1-203', 'A2-106', 'A2-107', 'A3-208', 'A3-209', 'B1-205', 'B1-206', 'B1-207', 'B2-104', 'B2-105', 'B3-301', 'C1-102', 'C1-103', 'C2-201', 'C2-202', 'C3-101', 'C3-102', 'D1-101'];
// End dates are exclusive; all sample reservations use non-overlapping date ranges.
const sampleRows=[
 ['A1-203','2026-11-09','2026-11-11','Peer tutoring','other'],
 ['A1-203','2026-11-13','2026-11-15','Architecture workshop','other'],
 ['A1-203','2026-11-17','2026-11-19','Group assignment','you'],
 ['A2-106','2026-11-10','2026-11-13','Seminar preparation','other'],
 ['A2-106','2026-11-16','2026-11-19','Study circle','other'],
 ['A2-107','2026-11-09','2026-11-10','Student club planning','you'],
 ['A2-107','2026-11-12','2026-11-15','Project demo rehearsal','other'],
 ['A2-107','2026-11-16','2026-11-19','Study meeting','other'],
 ['A3-208','2026-11-11','2026-11-14','Presentation practice','other'],
 ['A3-208','2026-11-16','2026-11-18','Tutorial group','other'],
 ['A3-209','2026-11-10','2026-11-12','Study session','other'],
 ['B1-205','2026-11-09','2026-11-11','Meeting','other'],
 ['B1-205','2026-11-13','2026-11-15','Team discussion','other'],
 ['B1-205','2026-11-16','2026-11-18','Course project','other'],
 ['B1-206','2026-11-11','2026-11-13','Exam revision','other'],
 ['B1-206','2026-11-17','2026-11-20','Debate practice','you'],
 ['B1-207','2026-11-10','2026-11-12','Group study','you'],
 ['B1-207','2026-11-16','2026-11-19','Engineering project','other'],
 ['B2-104','2026-11-09','2026-11-11','Weekly study group','you'],
 ['B2-104','2026-11-13','2026-11-15','Team planning','other'],
 ['B2-104','2026-11-17','2026-11-19','Workshop preparation','other'],
 ['B2-105','2026-11-12','2026-11-15','Club meeting','other'],
 ['B2-105','2026-11-16','2026-11-18','Student committee','other'],
 ['B3-301','2026-11-09','2026-11-10','Debate practice','other'],
 ['B3-301','2026-11-11','2026-11-13','Group preparation','other'],
 ['B3-301','2026-11-18','2026-11-20','Portfolio review','other'],
 ['C1-102','2026-11-10','2026-11-14','Capstone meeting','other'],
 ['C1-102','2026-11-16','2026-11-19','Revision session','other'],
 ['C1-103','2026-11-09','2026-11-12','Group project','other'],
 ['C1-103','2026-11-14','2026-11-16','Student society','you'],
 ['C2-201','2026-11-12','2026-11-15','Project sprint','other'],
 ['C2-201','2026-11-16','2026-11-19','Robotics club','other'],
 ['C2-202','2026-11-09','2026-11-11','Lab preparation','other'],
 ['C2-202','2026-11-18','2026-11-20','Teaching assistant session','other'],
 ['C3-101','2026-11-12','2026-11-14','Presentation rehearsal','you'],
 ['C3-101','2026-11-14','2026-11-16','Design workshop','other'],
 ['C3-101','2026-11-18','2026-11-20','Study group','other'],
 ['C3-102','2026-11-11','2026-11-15','Research meeting','other'],
 ['D1-101','2026-11-10','2026-11-13','Team check-in','other'],
 ['D1-101','2026-11-16','2026-11-18','Group assignment','you'],
];
const seed=sampleRows.map(([roomNumber,startDate,endDate,purpose,owner],index)=>({id:`demo-${index+1}`,roomNumber,startDate,endDate,purpose,owner}));
const formEmpty={roomNumber:'',startDate:'',endDate:'',purpose:''};
function read(){try{let a=JSON.parse(localStorage.getItem(STORAGE));return Array.isArray(a)?a:seed;}catch{return seed;}}
function addDays(iso,days){const t=new Date(`${iso}T12:00:00Z`);t.setUTCDate(t.getUTCDate()+days);return t.toISOString().slice(0,10);}
function human(iso){return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'});}
function weekDay(iso){return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'short'});}
function dayCount(start,end){return Math.round((new Date(`${end}T12:00:00Z`)-new Date(`${start}T12:00:00Z`))/864e5);}
// End dates are exclusive, so show the last day actually reserved.
function span(start,end){const n=dayCount(start,end),last=addDays(end,-1);return `${n<=1?human(start):`${human(start)} – ${human(last)}`} · ${n} day${n===1?'':'s'}`;}
function conflicts(form,bookings,id){return bookings.filter(b=>b.id!==id&&b.roomNumber.toLowerCase()===form.roomNumber.trim().toLowerCase()&&form.startDate<b.endDate&&form.endDate>b.startDate);}
function issue(form,bookings,id){
 if(!form.roomNumber.trim()||!form.startDate||!form.endDate)return 'Complete the room and both dates.';
 if(form.endDate<=form.startDate)return 'End date must follow start date.';
 if(conflicts(form,bookings,id).length)return 'This room is already booked for some of those dates.';
 return '';
}
// Turns an issue() message into something the form can point at: which fields, which bookings, and a way out.
function explain(form,bookings,id){
 const text=issue(form,bookings,id);if(!text)return null;
 const fields=[];
 if(!form.roomNumber.trim())fields.push('roomNumber');if(!form.startDate)fields.push('startDate');if(!form.endDate)fields.push('endDate');
 if(!fields.length&&form.endDate<=form.startDate)fields.push('endDate');
 const clash=fields.length?[]:conflicts(form,bookings,id);
 let suggestion=null;
 if(clash.length){const n=dayCount(form.startDate,form.endDate);for(let i=1;i<=60&&!suggestion;i++){const s=addDays(form.startDate,i),t={...form,startDate:s,endDate:addDays(s,n)};if(!conflicts(t,bookings,id).length)suggestion=t;}}
 if(clash.length)fields.push('startDate','endDate');
 return {text,fields,clash,suggestion};
}
export default function App(){
 const [bookings,setBookings]=useState(read);
 const [week,setWeek]=useState('2026-11-09');
 const [view,setView]=useState('All rooms');
 const [form,setForm]=useState({...formEmpty});
 const [editing,setEditing]=useState(null);
 const [error,setError]=useState(null);
 const [notice,setNotice]=useState('');
 const [tab,setTab]=useState('Availability');
 const [anchor,setAnchor]=useState(null);
 const roomInput=useRef(null);
 useEffect(()=>localStorage.setItem(STORAGE,JSON.stringify(bookings)),[bookings]);
 const days=useMemo(()=>Array.from({length:7},(_,i)=>addDays(week,i)),[week]);
 const myBookings=bookings.filter(b=>b.owner==='you').sort((a,b)=>a.startDate.localeCompare(b.startDate));
 const editingRow=bookings.find(b=>b.id===editing);
 const roomList=view==='All rooms'?rooms:rooms.filter(r=>r===view);
 const occupied=(room,date)=>bookings.find(b=>b.roomNumber===room&&date>=b.startDate&&date<b.endDate);
 const inDraft=(room,date)=>form.roomNumber===room&&form.startDate&&form.endDate>form.startDate&&date>=form.startDate&&date<form.endDate;
 const invalid=name=>error?.fields.includes(name)||undefined;
 function showForm(){const el=document.getElementById('booking-form');if(!el)return;el.scrollIntoView({behavior:'smooth',block:'nearest'});roomInput.current?.focus({preventScroll:true});}
 function update(name,value){setForm(f=>({...f,[name]:value}));setError(null);setNotice('');if(name!=='purpose')setAnchor(null);}
 function pick(room,date){
  const b=occupied(room,date);
  // Clicking what is already selected deselects it: the booking being changed, or the new-booking selection.
  if(editing&&(b?.id===editing||inDraft(room,date))){cancelEdit();return;}
  if(b){if(b.owner==='you')edit(b);return;}
  setError(null);setNotice('');
  if(inDraft(room,date)){
   // The first or last day of a longer range trims just that day; any other selected day clears the whole selection.
   const last=addDays(form.endDate,-1);
   if(form.startDate!==last&&date===last)setForm(f=>({...f,endDate:last}));
   else if(form.startDate!==last&&date===form.startDate)setForm(f=>({...f,startDate:addDays(f.startDate,1)}));
   else setForm(f=>({...formEmpty,purpose:f.purpose}));
   setAnchor(null);return;
  }
  const end=addDays(date,1);
  if(anchor&&anchor.room===room&&date>=anchor.date&&!conflicts({roomNumber:room,startDate:anchor.date,endDate:end},bookings,null).length){setForm(f=>({...f,endDate:end}));setAnchor(null);return;}
  // A free day always starts a new booking, so it also leaves edit mode.
  setEditing(null);setForm({roomNumber:room,startDate:date,endDate:end,purpose:''});setAnchor({room,date});
 }
 function edit(row){if(row.owner!=='you')return;setEditing(row.id);setForm({roomNumber:row.roomNumber,startDate:row.startDate,endDate:row.endDate,purpose:row.purpose});setError(null);setNotice('');setAnchor(null);requestAnimationFrame(showForm);}
 function cancelEdit(){setEditing(null);setForm({...formEmpty});setError(null);setNotice('');setAnchor(null);}
 function submit(e){e.preventDefault();setNotice('');const err=explain(form,bookings,editing);if(err){setError(err);return;}const payload={roomNumber:form.roomNumber.trim(),startDate:form.startDate,endDate:form.endDate,purpose:form.purpose.trim(),owner:'you'};
 if(editing){setBookings(bookings.map(b=>b.id===editing?{...b,...payload}:b));setNotice(`Booking updated: ${payload.roomNumber}, ${span(payload.startDate,payload.endDate)}.`);}else{setBookings([...bookings,{...payload,id:'b-'+Date.now()}]);setNotice(`Room reserved: ${payload.roomNumber}, ${span(payload.startDate,payload.endDate)}.`);}setForm({...formEmpty});setEditing(null);setError(null);setAnchor(null);}
 function reset(){setBookings(seed);setForm({...formEmpty});setEditing(null);setWeek('2026-11-09');setNotice('Example bookings restored.');setError(null);setView('All rooms');setAnchor(null);}
 function check(){setNotice('');setError(null);let e=explain(form,bookings,editing);if(e){setError(e);}else setNotice('No conflict detected for the selected dates.');}
 function applySuggestion(){const s=error.suggestion;setForm(s);setError(null);setAnchor(null);setNotice(`Dates moved to ${span(s.startDate,s.endDate)} — no conflicts. Confirm to keep them.`);}
 const hint=anchor?`Start: ${anchor.room}, ${weekDay(anchor.date)} ${human(anchor.date)}. Click a later open day in the same row to extend, click it again to clear, or continue in the form.`:editing?'Change the dates in the form to move this booking. Click it again to stop changing it; clicking an open day starts a new booking instead.':form.roomNumber&&form.endDate>form.startDate?'Click the first or last selected day to remove it, another selected day to clear the selection, or an open day to start again.':'Click an open day to start, then a later day in the same row to choose a range.';
 return <div className="room-app"><header className="topbar"><div className="mark"><span className="mark-sq">R</span><span><strong>room<span>grid</span></strong><small>Campus spaces</small></span></div><nav><button className={tab==='Availability'?'selected':''} onClick={()=>{setTab('Availability');window.scrollTo({top:0,behavior:'smooth'});}}>Availability</button><button className={tab==='My bookings'?'selected':''} onClick={()=>{setTab('My bookings');document.getElementById('my-reservations')?.scrollIntoView({behavior:'smooth'});}}>My bookings</button><button onClick={reset}>Reset demo</button></nav><div className="member"><span>Student dashboard</span><div className="profile">YOU</div></div></header>
  <main><section className="intro"><div><span className="eyebrow">SPACES / RESERVATIONS</span><h1>Find room availability</h1><p>Review campus rooms, dates and existing reservations in one view.</p></div><div className="intro-summary"><span>ROOMS IN DIRECTORY</span><strong>{rooms.length.toString().padStart(2,'0')}</strong><span>CURRENT RESERVATIONS</span><strong>{bookings.length.toString().padStart(2,'0')}</strong></div></section>
   <div className="pagegrid"><section className="calendar-pane"><div className="calendar-head"><div><span className="eyebrow">AVAILABILITY CALENDAR</span><h2>Rooms by day</h2></div><div className="weeknav"><button aria-label="Previous week" onClick={()=>setWeek(addDays(week,-7))}>←</button><strong>{human(week)} – {human(addDays(week,6))}</strong><button aria-label="Next week" onClick={()=>setWeek(addDays(week,7))}>→</button></div></div>
    <div className="calendar-controls"><label>Room <select value={view} onChange={e=>setView(e.target.value)}><option>All rooms</option>{rooms.map(r=><option key={r}>{r}</option>)}</select></label><span className="legend"><i className="free"/> Available</span><span className="legend"><i className="booked"/> Reserved</span><span className="legend"><i className="mine"/> Your booking</span><span className="legend"><i className="picked"/> Your selection</span><p aria-live="polite">{hint}</p></div>
    <div className="calendar-scroll"><div className="room-cal"><div className="corner">ROOM / DATE</div>{days.map(d=><div className="dayhead" key={d}><strong>{weekDay(d)}</strong><span>{human(d)}</span></div>)}{roomList.map((room,i)=><React.Fragment key={room}><div className="roomname"><strong>{room}</strong><small>Study room · {room[0]}</small></div>{days.map(day=>{const b=occupied(room,day),own=b&&b.owner==='you',draft=inDraft(room,day),edge=draft&&!editing&&form.endDate>addDays(form.startDate,1)&&(day===form.startDate||day===addDays(form.endDate,-1)),locked=b&&!own&&b.id!==editing;const label=`${room}, ${weekDay(day)} ${human(day)}: ${editing&&(draft||b?.id===editing)?'booking you are changing, click to stop changing':draft?edge?'selected, click to remove this day':'selected, click to clear the selection':b?b.id===editing?'booking you are changing':own?'your booking, click to change':'reserved, not available':'available, click to select'}`;return <button key={room+day} title={label} aria-label={label} aria-disabled={locked||undefined} aria-pressed={draft||undefined} className={'slot '+(locked?'taken':own?'mine':'available')+(draft?' picked':'')+(anchor&&anchor.room===room&&anchor.date===day?' anchor':'')} onClick={()=>pick(room,day)}><span>{draft?'Selected':b?own?'Yours':'Booked':'Open'}</span>{draft&&!b&&<small>{editing?'Click to stop':edge?'Click to remove':'Click to clear'}</small>}{b&&<small>{b.id===editing?'Changing':own?'Click to change':'Reserved'}</small>}</button>})}</React.Fragment>)}</div></div>
    <p className="calendar-note">Cells show individual dates. Reserved days can't be selected; a range can only be extended across open days.</p>
    <section id="my-reservations" className="reservations"><div className="reservations-head"><h2>Your bookings</h2><span>{myBookings.length} current records</span></div><div className="reservations-list">{myBookings.map(b=><article key={b.id} className={'reservation'+(b.id===editing?' editing':'')}><div className="room-chip">{b.roomNumber}</div><div className="reservation-body"><strong>{span(b.startDate,b.endDate)}</strong><small>{b.purpose||'No purpose entered'}</small></div>{b.id===editing?<span className="editing-tag">Editing</span>:<button onClick={()=>edit(b)} aria-label={`Change ${b.roomNumber} booking, ${span(b.startDate,b.endDate)}`}>Change</button>}</article>)}{myBookings.length===0&&<p>No reservations.</p>}</div></section></section>
    <aside className={'booking-pane'+(editing?' is-editing':'')} id="booking-form"><div className="panel-tag"><span>{editing?'CHANGE A BOOKING':'BOOK A ROOM'}</span><span>FORM 01</span></div><h2>{editing?'Change reservation':'Make a reservation'}</h2>{editingRow?<p className="editing-summary">Changing your booking: <strong>{editingRow.roomNumber}</strong>, {span(editingRow.startDate,editingRow.endDate)}{editingRow.purpose?` — ${editingRow.purpose}`:''}</p>:<p className="booking-description">Use this panel to request a room for your study group, meeting or activity.</p>}{notice&&<div className="success" role="status">{notice}</div>}{error&&<div className="error" role="alert"><strong>{error.text}</strong>{error.clash.length>0&&<ul>{error.clash.map(c=><li key={c.id}>{c.roomNumber} is {c.owner==='you'?'your booking':'reserved'} {span(c.startDate,c.endDate)}{c.owner==='you'&&c.purpose?` (${c.purpose})`:''}</li>)}</ul>}{error.suggestion&&<button type="button" className="suggest" onClick={applySuggestion}>Use next free dates: {span(error.suggestion.startDate,error.suggestion.endDate)}</button>}</div>}<form onSubmit={submit} noValidate><label><span>Room number</span><input ref={roomInput} list="rooms" placeholder="e.g., B2-104" aria-invalid={invalid('roomNumber')} value={form.roomNumber} onChange={e=>update('roomNumber',e.target.value)}/><datalist id="rooms">{rooms.map(r=><option key={r} value={r}/>)}</datalist></label><div className="date-pair"><label><span>Start date</span><input type="date" aria-invalid={invalid('startDate')} value={form.startDate} onChange={e=>update('startDate',e.target.value)}/></label><label><span>End date (not included)</span><input type="date" aria-invalid={invalid('endDate')} min={form.startDate?addDays(form.startDate,1):undefined} value={form.endDate} onChange={e=>update('endDate',e.target.value)}/></label></div>{form.startDate&&form.endDate>form.startDate&&<p className="range-summary">Reserves {span(form.startDate,form.endDate)}. The end date itself stays free.</p>}<label><span>Purpose / optional</span><textarea rows="5" placeholder="Meeting, group study..." value={form.purpose} onChange={e=>update('purpose',e.target.value)}/></label><p className="helper">Start and end dates are required. Reservations cannot overlap existing bookings for the same room.</p><button className="availability-check" type="button" onClick={check}>Check availability</button><button className="reserve-button" type="submit">{editing?'Save booking':'Confirm booking'}</button>{editing&&<button className="cancel-edit" type="button" onClick={cancelEdit}>Cancel editing</button>}</form><div className="right-foot"><span>✦</span> Need a room for a group? Find an open date and submit your request.</div></aside></div>
  </main>{form.roomNumber&&form.startDate&&<div className="selection-bar"><span><strong>{editing?'Changing':'Selected'}:</strong> {form.roomNumber}{form.endDate>form.startDate?`, ${span(form.startDate,form.endDate)}`:''}</span><button type="button" onClick={showForm}>Review booking ↓</button></div>}<footer>ROOMGRID / Academic campus demo — local browser data only.</footer>
 </div>;
}
