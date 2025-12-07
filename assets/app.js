// Modern Calendar — frontend app.js (upgraded & responsive)
// Data model in localStorage:
// mc_users = { username: { password: '...', events: [...], tasks: [...], settings: { theme: 'dark' } } }
// current user -> mc_current

(function(){
  // --- helpers ---
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

  function loadUsers(){ return JSON.parse(localStorage.getItem('mc_users')||'{}'); }
  function saveUsers(u){ localStorage.setItem('mc_users', JSON.stringify(u)); }
  function currentUser(){ return localStorage.getItem('mc_current'); }
  function setCurrentUser(u){ if(u) localStorage.setItem('mc_current', u); else localStorage.removeItem('mc_current'); }
  function userDb(){ const u=currentUser(); const us=loadUsers(); return u && us[u] ? us[u] : null; }
  function updateUser(fn){ const us=loadUsers(); const u=currentUser(); if(!u) return; fn(us[u]); saveUsers(us); }

  // theme
  function applyTheme(){
    const db = userDb();
    const theme = (db && db.settings && db.settings.theme) ? db.settings.theme : 'dark';
    document.documentElement.classList.toggle('light', theme === 'light');
  }

  // Auth pages
  if($('#loginForm')){
    $('#loginForm').addEventListener('submit', e=>{
      e.preventDefault();
      const username = $('#login-username').value.trim();
      const password = $('#login-password').value;
      const users = loadUsers();
      const err = $('#login-error'); err.textContent='';
      if(!users[username] || users[username].password !== password){
        err.textContent = 'Invalid username or password'; return;
      }
      setCurrentUser(username);
      applyTheme();
      location.href = 'dashboard.html';
    });
  }

  if($('#registerForm')){
    $('#registerForm').addEventListener('submit', e=>{
      e.preventDefault();
      const username = $('#reg-username').value.trim();
      const p1 = $('#reg-password').value;
      const p2 = $('#reg-password2').value;
      const err = $('#reg-error'); err.textContent='';
      if(!username || !p1){ err.textContent = 'Enter username and password'; return; }
      if(p1 !== p2){ err.textContent = 'Passwords do not match'; return; }
      const users = loadUsers();
      if(users[username]){ err.textContent = 'Username already exists'; return; }
      users[username] = { password: p1, events: [], tasks: [], settings: { theme: 'dark' } };
      saveUsers(users);
      alert('Account created — you can now sign in');
      location.href = 'index.html';
    });
  }

  // common elements (logout, theme toggle, user info)
  if($$('#logoutBtn').length || $$('#themeToggle').length || $$('#user-info').length){
    $$('#logoutBtn').forEach(btn => btn.addEventListener('click', ()=>{
      setCurrentUser(null);
      location.href='index.html';
    }));

    $$('#themeToggle').forEach(btn => btn.addEventListener('click', ()=>{
      updateUser(db=>{
        db.settings = db.settings || {};
        db.settings.theme = (db.settings.theme === 'light' ? 'dark' : 'light');
      });
      applyTheme();
    }));

    $$('#user-info').forEach(el => {
      const u=currentUser();
      el.textContent = u ? u : 'Guest';
    });

    applyTheme();
  }

  // Calendar page
  if($('#calendarGrid')){
    let viewDate = new Date();
    let selectedEvent = null;
    const monthLabel = $('#monthLabel');
    const monthSelect = $('#monthSelect');
    const calendarGrid = $('#calendarGrid');
    const yearDisplay = $('#yearDisplay');
    const yearPicker = $('#yearPicker');
    const yearList = $('#yearList');

    // fill month select
    const months = [...Array(12).keys()].map(i => 
      new Date(0,i).toLocaleString('default',{month:'long'})
    );

    months.forEach((m,i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });

    function render(){
      calendarGrid.innerHTML = '';
      const y = viewDate.getFullYear();
      const m = viewDate.getMonth();
      monthLabel.textContent = viewDate.toLocaleString('default',{month:'long'}) + ' ' + y;
      monthSelect.value = m;
      yearDisplay.textContent = y + ' ▾';

      const firstDay = new Date(y,m,1).getDay();
      const daysInMonth = new Date(y,m+1,0).getDate();

      // leading blanks
      for(let i=0;i<firstDay;i++) calendarGrid.appendChild(createEmptyCell());

      const db = userDb() || { events: [] };
      const today = new Date();
      const todayY = today.getFullYear();
      const todayM = today.getMonth();
      const todayD = today.getDate();

      for(let d=1; d<=daysInMonth; d++){
        const dateISO = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const cell = document.createElement('div');
        cell.className='cell';
        cell.innerHTML = `<div class="date">${d}</div>`;

        // --- CURRENT DAY HIGHLIGHT ---
        if(y === todayY && m === todayM && d === todayD){
          cell.classList.add("today");
        }

        // events
        const todays = (db.events||[]).filter(e => e.date === dateISO);
        todays.slice(0,2).forEach(e=>{
          const pill = document.createElement('div');
          pill.className='event-pill';
          pill.textContent = e.title;
          cell.appendChild(pill);
        });

        if(todays.length>2){
          const more = document.createElement('div');
          more.className='muted';
          more.style.marginTop='8px';
          more.textContent = `+${todays.length-2} more`;
          cell.appendChild(more);
        }

        cell.addEventListener('click', ()=> openModal(dateISO, todays[0] || null));
        calendarGrid.appendChild(cell);
      }
    }

    function createEmptyCell(){
      const d=document.createElement('div');
      d.className='cell';
      d.style.visibility='hidden';
      return d;
    }

    // month select
    monthSelect.addEventListener('change', ()=>{
      viewDate.setMonth(parseInt(monthSelect.value));
      render();
    });

    // month arrows
    $('#prevMonth').addEventListener('click', ()=>{
      viewDate.setMonth(viewDate.getMonth()-1);
      render();
    });
    $('#nextMonth').addEventListener('click', ()=>{
      viewDate.setMonth(viewDate.getMonth()+1);
      render();
    });

    // year arrows
    $('#prevYear').addEventListener('click', ()=>{
      viewDate.setFullYear(viewDate.getFullYear()-1);
      render();
    });
    $('#nextYear').addEventListener('click', ()=>{
      viewDate.setFullYear(viewDate.getFullYear()+1);
      render();
    });

    // year display opens picker
    yearDisplay.addEventListener('click', ()=>{
      populateYearList();
      yearPicker.style.display='flex';
      yearPicker.setAttribute('aria-hidden','false');
    });

    $('#closeYearPicker').addEventListener('click', ()=>{
      yearPicker.style.display='none';
      yearPicker.setAttribute('aria-hidden','true');
    });

    function populateYearList(){
      yearList.innerHTML='';
      const currentYear = new Date().getFullYear();
      for(let y=currentYear-20; y<=currentYear+20; y++){
        const b = document.createElement('button');
        b.className='btn ghost';
        b.textContent = y;
        b.addEventListener('click', ()=>{
          viewDate.setFullYear(y);
          yearPicker.style.display='none';
          render();
        });
        yearList.appendChild(b);
      }
    }

    // modal open/close
    const modal = $('#modal');
    const closeModal = $('#closeModal');
    
    closeModal.addEventListener('click', ()=>{
      modal.style.display='none';
      modal.setAttribute('aria-hidden','true');
      selectedEvent=null;
    });

    function openModal(dateISO, ev){
      selectedEvent = ev || null;
      $('#modalTitle').textContent = ev ? 'Edit Event' : 'Add Event';
      $('#eventTitle').value = ev ? ev.title : '';
      $('#eventTime').value = ev ? ev.time || '' : '';
      $('#eventCategory').value = ev ? ev.category || '' : '';
      $('#eventDesc').value = ev ? ev.description || '' : '';
      modal.style.display='flex';
      modal.setAttribute('aria-hidden','false');
      modal.dataset.date = dateISO;
      $('#deleteEvent').style.display = ev ? 'inline-block' : 'none';
    }

    $('#saveEvent').addEventListener('click', e=>{
      e.preventDefault();
      const title = $('#eventTitle').value.trim();
      if(!title) return alert('Title required');
      const eventObj = {
        id: selectedEvent ? selectedEvent.id : id(),
        title,
        time: $('#eventTime').value,
        category: $('#eventCategory').value,
        description: $('#eventDesc').value,
        date: modal.dataset.date
      };
      updateUser(db=>{
        db.events = db.events || [];
        db.events = db.events.filter(x=> !(selectedEvent && x.id===selectedEvent.id));
        db.events.push(eventObj);
      });
      modal.style.display='none';
      render();
    });

    $('#deleteEvent').addEventListener('click', ()=>{
      if(!selectedEvent) return;
      if(!confirm('Delete event?')) return;
      updateUser(db=>{
        db.events = db.events.filter(x=> x.id !== selectedEvent.id);
      });
      modal.style.display='none';
      render();
    });

    render();
  } // calendar

  // Tasks page
  if($('#addTaskBtn')){
    const listEl = $('#taskList');
    function renderTasks(){
      const db = userDb();
      listEl.innerHTML = '';
      if(!db) return;
      db.tasks = db.tasks || [];
      
      db.tasks.forEach(t=>{
        const li = document.createElement('li');
        li.className='task-item';
        li.innerHTML = `
        <div>
          <strong>${t.title}</strong>
          <div class="muted">${t.due || ''}</div>
          <div class="muted">${t.description || ''}</div>
        </div>
        <div>
          <input type="checkbox" ${t.done ? 'checked' : ''} />
          <button class="btn ghost">Delete</button>
        </div>`;

        const checkbox = li.querySelector('input[type=checkbox]');
        const delBtn = li.querySelector('button');

        checkbox.addEventListener('change', ()=>{
          updateUser(db=>{
            const it=db.tasks.find(x=>x.id===t.id);
            if(it) it.done = checkbox.checked;
          });
        });

        delBtn.addEventListener('click', ()=>{
          if(confirm('Delete task?'))
            updateUser(db=>{
              db.tasks = db.tasks.filter(x=>x.id!==t.id);
              renderTasks();
            });
        });

        listEl.appendChild(li);
      });
    }

    $('#addTaskBtn').addEventListener('click', ()=>{
      const title = $('#taskTitle').value.trim();
      const due = $('#taskDue').value;
      const desc = '';
      if(!title) return alert('Task title required');
      updateUser(db=>{
        db.tasks = db.tasks || [];
        db.tasks.push({ id:id(), title, due, description: desc, done:false });
      });
      $('#taskTitle').value='';
      $('#taskDue').value='';
      renderTasks();
    });

    renderTasks();
  }

  // Events list page
  if($('#eventsList')){
    function renderEventsList(){
      const db = userDb();
      const el = $('#eventsList');
      el.innerHTML='';
      if(!db) return;

      db.events = db.events || [];
      db.events.sort((a,b)=> a.date.localeCompare(b.date));

      db.events.forEach(e=>{
        const li = document.createElement('li');
        li.className='event-item';
        li.innerHTML = `
        <div>
          <strong>${e.title}</strong>
          <div class="muted">${e.date} ${e.time || ''} ${e.category ? ' • ' + e.category : ''}</div>
          <div class="muted">${e.description || ''}</div>
        </div>
        <div>
          <button class="btn ghost">Edit</button>
          <button class="btn outline">Delete</button>
        </div>`;

        li.querySelector('.ghost').addEventListener('click', ()=>{
          location.href='calendar.html';
        });

        li.querySelector('.outline').addEventListener('click', ()=>{
          if(confirm('Delete?'))
            updateUser(db=>{
              db.events = db.events.filter(x=>x.id!==e.id);
              renderEventsList();
            });
        });

        el.appendChild(li);
      });
    }

    renderEventsList();
  }

})();
