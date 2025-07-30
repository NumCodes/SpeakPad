document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const notesList = document.getElementById('notes-list');
    const noteEditor = document.getElementById('note-editor');
    const emptyState = document.getElementById('empty-state');
    const activeNote = document.getElementById('active-note');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const noteDate = document.getElementById('note-date');
    const wordCount = document.getElementById('word-count');
    const addNoteBtn = document.getElementById('add-note');
    const saveNoteBtn = document.getElementById('save-note');
    const deleteNoteBtn = document.getElementById('delete-note');
    const startRecordingBtn = document.getElementById('start-recording');
    const stopRecordingBtn = document.getElementById('stop-recording');
    const recordingStatus = document.getElementById('recording-status');
    const searchNotes = document.getElementById('search-notes');
    const clearAllBtn = document.getElementById('clear-all');
    const themeToggle = document.getElementById('theme-toggle');
    const toast = document.getElementById('toast');

    // App state
    let notes = JSON.parse(localStorage.getItem('voice-notes')) || [];
    let currentNoteId = null;
    let recognition = null;
    let isRecording = false;

    // Initialize the app
    init();

    // Event listeners
    addNoteBtn.addEventListener('click', createNewNote);
    saveNoteBtn.addEventListener('click', saveNote);
    deleteNoteBtn.addEventListener('click', deleteNote);
    startRecordingBtn.addEventListener('click', startRecording);
    stopRecordingBtn.addEventListener('click', stopRecording);
    searchNotes.addEventListener('input', searchNotesHandler);
    clearAllBtn.addEventListener('click', clearAllNotes);
    themeToggle.addEventListener('click', toggleTheme);

    // Check for speech recognition support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        startRecordingBtn.disabled = true;
        startRecordingBtn.title = "Speech recognition not supported in your browser";
    } else {
        setupSpeechRecognition();
    }

    // Functions
    function init() {
        renderNotesList();
        checkThemePreference();
        updateWordCount();

        // Update word count as user types
        noteContent.addEventListener('input', updateWordCount);
    }

    function setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            // Append to note content
            if (finalTranscript) {
                noteContent.innerHTML += finalTranscript;
                updateWordCount();
            }
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            showToast('Error: ' + event.error);
            stopRecording();
        };

        recognition.onend = function() {
            if (isRecording) {
                recognition.start(); // Restart if we're still supposed to be recording
            }
        };
    }

    function renderNotesList(filteredNotes = null) {
        const notesToRender = filteredNotes || notes;
        notesList.innerHTML = '';

        if (notesToRender.length === 0) {
            notesList.innerHTML = '<p class="empty-notes">No notes yet. Create your first note!</p>';
            return;
        }

        notesToRender.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = `note-item ${note.id === currentNoteId ? 'active' : ''}`;
            noteItem.innerHTML = `
                <h3>${note.title || 'Untitled Note'}</h3>
                <p>${getPreviewText(note.content)}</p>
                <span class="note-date">${formatDate(note.updatedAt)}</span>
            `;
            noteItem.addEventListener('click', () => loadNote(note.id));
            notesList.appendChild(noteItem);
        });
    }

    function getPreviewText(content) {
        const div = document.createElement('div');
        div.innerHTML = content;
        const text = div.textContent || div.innerText || '';
        return text.substring(0, 100) + (text.length > 100 ? '...' : '');
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function createNewNote() {
        currentNoteId = Date.now().toString();
        noteTitle.value = '';
        noteContent.innerHTML = '';
        noteDate.textContent = 'Just now';
        showActiveNote();
        noteTitle.focus();
    }

    function loadNote(noteId) {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        currentNoteId = noteId;
        noteTitle.value = note.title;
        noteContent.innerHTML = note.content;
        noteDate.textContent = `Updated: ${formatDate(note.updatedAt)}`;
        showActiveNote();
        updateWordCount();
    }

    function showActiveNote() {
        emptyState.style.display = 'none';
        activeNote.style.display = 'flex';
    }

    function showEmptyState() {
        emptyState.style.display = 'flex';
        activeNote.style.display = 'none';
        currentNoteId = null;
    }

    function saveNote() {
        if (!currentNoteId) return;

        const title = noteTitle.value.trim() || 'Untitled Note';
        const content = noteContent.innerHTML.trim();
        const now = new Date().toISOString();

        const existingNoteIndex = notes.findIndex(n => n.id === currentNoteId);
        
        if (existingNoteIndex !== -1) {
            // Update existing note
            notes[existingNoteIndex] = {
                ...notes[existingNoteIndex],
                title,
                content,
                updatedAt: now
            };
        } else {
            // Create new note
            notes.unshift({
                id: currentNoteId,
                title,
                content,
                createdAt: now,
                updatedAt: now
            });
        }

        localStorage.setItem('voice-notes', JSON.stringify(notes));
        renderNotesList();
        showToast('Note saved successfully');
    }

    function deleteNote() {
        if (!currentNoteId) return;

        if (confirm('Are you sure you want to delete this note?')) {
            notes = notes.filter(note => note.id !== currentNoteId);
            localStorage.setItem('voice-notes', JSON.stringify(notes));
            showToast('Note deleted');
            renderNotesList();
            showEmptyState();
        }
    }

    function clearAllNotes() {
        if (notes.length === 0) return;

        if (confirm('Are you sure you want to delete ALL notes? This cannot be undone.')) {
            notes = [];
            localStorage.setItem('voice-notes', JSON.stringify(notes));
            showToast('All notes deleted');
            renderNotesList();
            showEmptyState();
        }
    }

    function startRecording() {
        if (!recognition) return;

        try {
            recognition.start();
            isRecording = true;
            startRecordingBtn.disabled = true;
            stopRecordingBtn.disabled = false;
            recordingStatus.style.display = 'flex';
            showToast('Recording started. Speak now...');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            showToast('Error starting recording');
        }
    }

    function stopRecording() {
        if (!recognition) return;

        recognition.stop();
        isRecording = false;
        startRecordingBtn.disabled = false;
        stopRecordingBtn.disabled = true;
        recordingStatus.style.display = 'none';
        showToast('Recording stopped');
    }

    function searchNotesHandler() {
        const searchTerm = searchNotes.value.toLowerCase();
        if (!searchTerm) {
            renderNotesList();
            return;
        }

        const filteredNotes = notes.filter(note => {
            const titleMatch = note.title.toLowerCase().includes(searchTerm);
            const contentMatch = note.content.toLowerCase().includes(searchTerm);
            return titleMatch || contentMatch;
        });

        renderNotesList(filteredNotes);
    }

    function updateWordCount() {
        const text = noteContent.textContent || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    function checkThemePreference() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});