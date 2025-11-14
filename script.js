// Initialize the app and set the current date
document.addEventListener('DOMContentLoaded', initializeApp);

// Global variables
let taskList = document.getElementById('task-list');
let subtaskList = document.getElementById('subtask-list');
let subtaskInput = document.getElementById('subtask-input');
let currentTaskTitle = document.getElementById('current-task-title');
let floatingTimer = null;
let activeStopwatch = null;
let currentSelectedTaskId = null;

// Initialize the application
function initializeApp() {
  // Set the current date
  updateCurrentDate();
  
  // Get task list element
  taskList = document.getElementById('task-list');
  subtaskList = document.getElementById('subtask-list');
  subtaskInput = document.getElementById('subtask-input');
  currentTaskTitle = document.getElementById('current-task-title');
  
  // Clean up old time logs - keeping only last 7 days
  const logsKept = cleanUpTimeLogs();
  console.log(`Time logs cleaned up: keeping the last 7 days (${logsKept} entries)`);
  
  // Load tasks from local storage
  loadFromLocalStorage();
  
  // Set up event listeners
  setupEventListeners();
  
  // Add reset timers button
  addResetTimersButton();
}

// Update and format the current date
function updateCurrentDate() {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  document.getElementById('current-date').innerText = new Date().toLocaleDateString(undefined, options);
}

// Set up all event listeners
function setupEventListeners() {
  // Listen for task input
  const targetInput = document.getElementById('target-input');
  targetInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      addTarget(event);
    }
  });
  
  // Listen for subtask input
  subtaskInput = document.getElementById('subtask-input');
  subtaskInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && this.value.trim()) {
      console.log("Adding subtask:", this.value.trim());
      addSubtaskToCurrentTask(this.value.trim());
      this.value = '';
    }
  });
  
  // Listen for blockquote changes
  const blockquote = document.querySelector('.beliefs');
  if (blockquote) {
    blockquote.addEventListener('input', function() {
      localStorage.setItem('blockquote', blockquote.innerText.trim());
    });
  }
  
  // Listen for changes to task or subtask text
  document.addEventListener('input', function(event) {
    if (event.target.classList.contains('task-text') || 
        event.target.classList.contains('subtask-text')) {
      saveToLocalStorage();
    }
  });
  
  // Make sure report button works
  const reportBtn = document.querySelector('.report-btn');
  if (reportBtn) {
    // Remove any existing onclick handler to avoid duplication
    reportBtn.removeAttribute('onclick');
    
    // Add explicit event listener
    reportBtn.addEventListener('click', function() {
      console.log("Report button clicked");
      generateTimeReport();
    });
  }
}

// Handle adding a new task when Enter is pressed
function addTarget(event) {
  if (event.key === 'Enter') {
    const targetInput = document.getElementById('target-input');
    if (targetInput.value.trim()) {
      addTask(targetInput.value.trim());
      targetInput.value = '';
      saveToLocalStorage();
      
      // Provide visual feedback
      targetInput.classList.add('success-flash');
      setTimeout(() => {
        targetInput.classList.remove('success-flash');
      }, 300);
    }
  }
}

// Update the addTask function to include a start button on the main task
function addTask(taskText, completed = false, subtasks = [], expectedDuration = 0, elapsedTime = 0) {
  const taskId = 'task-' + Date.now().toString();
  const newTask = document.createElement('li');
  newTask.classList.add('task');
  newTask.dataset.taskId = taskId;
  
  // Format the duration display text
  const durationDisplayText = formatExpectedDuration(expectedDuration);
  
  // Updated HTML structure with normal checkbox for the main task
  newTask.innerHTML = `
    <div class="task-promotion-indicator"><i class="fas fa-angle-right"></i></div>
    <label class="task-checkbox-container">
      <input type="checkbox" class="task-checkbox" ${completed ? 'checked' : ''}>
    </label>
    <span class="task-text" contenteditable="true">${taskText}</span>
    <div class="task-time-container">
      <span class="task-duration">
        <i class="fas fa-clock duration-icon" onclick="showDurationDialog(this)"></i>
        <span class="expected-duration-display">${durationDisplayText}</span>
        <input type="hidden" class="expected-duration" value="${expectedDuration}">
      </span>
      <span class="task-stopwatch" data-time="${elapsedTime}">00:00:00</span>
      <button class="task-timer-btn" onclick="toggleTaskTimer(this)" aria-label="Start/stop task timer">
        <i class="fas fa-play"></i>
      </button>
    </div>
    <button class="task-delete" onclick="deleteTask(this)" aria-label="Delete task">
      <i class="fas fa-trash-alt"></i>
    </button>
  `;
  
  taskList.appendChild(newTask);
  
  // Add event listener directly to the task checkbox
  const checkbox = newTask.querySelector('.task-checkbox');
  checkbox.addEventListener('change', function() {
    toggleTaskCompletion(this);
  });
  
  // Add click event listener to select task
  newTask.addEventListener('click', function(e) {
    // Prevent selection when clicking on buttons or checkbox
    if (e.target.closest('.task-checkbox-container') || 
        e.target.closest('.task-timer-btn') || 
        e.target.closest('.task-delete') ||
        e.target.closest('.task-duration') ||
        e.target.closest('.fa-clock')) {
      return;
    }
    console.log("Task clicked, selecting:", this.dataset.taskId);
    selectTask(this);
  });
  
  // Store the subtasks in the task's data attribute
  newTask.dataset.subtasks = JSON.stringify(subtasks);
  
  // Update the task's stopwatch display
  updateStopwatchDisplay(newTask.querySelector('.task-stopwatch'));
  
  // Apply strike-through if the task is completed
  if (completed) {
    newTask.querySelector('.task-text').classList.add('strike-through');
  }
  
  // Animate the new task
  newTask.style.opacity = '0';
  newTask.style.transform = 'translateY(-10px)';
  
  // Trigger animation after a short delay
  setTimeout(() => {
    newTask.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    newTask.style.opacity = '1';
    newTask.style.transform = 'translateY(0)';
  }, 10);
}

// Select a task and load its subtasks
function selectTask(taskElement) {
  console.log("FUNCTION CALLED: selectTask for", taskElement.dataset.taskId);
  
  // Clear previous selection
  document.querySelectorAll('.task.selected').forEach(task => {
    task.classList.remove('selected');
  });
  
  // Add selected class to current task
  taskElement.classList.add('selected');
  
  // Get task ID
  const taskId = taskElement.dataset.taskId;
  currentSelectedTaskId = taskId;
  console.log("Set currentSelectedTaskId to:", currentSelectedTaskId);
  
  // Update the subtasks column header
  const taskText = taskElement.querySelector('.task-text').innerText;
  currentTaskTitle.innerText = taskText;
  
  // Clear previous subtasks
  subtaskList.innerHTML = '';
  
  // Enable the subtask input
  subtaskInput.disabled = false;
  const lowercaseTaskText = taskText.charAt(0).toLowerCase() + taskText.slice(1);
  subtaskInput.placeholder = `To ${lowercaseTaskText}, I should...`;
  
  
  // CRITICAL: Get subtasks directly from localStorage instead of data attribute
  let subtasks = [];
  
  try {
    // Get tasks from localStorage
    const tasksFromStorage = JSON.parse(localStorage.getItem('tasks') || '[]');
    console.log("Tasks from localStorage:", JSON.stringify(tasksFromStorage));
    
    // Find the current task
    const task = tasksFromStorage.find(t => t.taskId === taskId);
    
    if (task) {
      console.log("Found task in localStorage:", task.text);
      
      if (Array.isArray(task.subtasks)) {
        subtasks = task.subtasks;
        console.log("Loaded subtasks from localStorage:", JSON.stringify(subtasks));
        
        // Also update the data attribute to keep in sync
        taskElement.dataset.subtasks = JSON.stringify(subtasks);
      } else {
        console.log("Task has no subtasks array in localStorage");
        taskElement.dataset.subtasks = '[]';
      }
    } else {
      console.log("Task not found in localStorage, falling back to data attribute");
      
      // Fallback to data attribute
      if (taskElement.dataset.subtasks && taskElement.dataset.subtasks.trim() !== '') {
        subtasks = JSON.parse(taskElement.dataset.subtasks);
        console.log("Loaded subtasks from data attribute:", JSON.stringify(subtasks));
      } else {
        console.log("No subtasks in data attribute either");
      }
    }
  } catch (e) {
    console.error("Error loading subtasks:", e);
    
    // Try fallback to data attribute
    try {
      if (taskElement.dataset.subtasks && taskElement.dataset.subtasks.trim() !== '') {
        subtasks = JSON.parse(taskElement.dataset.subtasks);
        console.log("Fallback: Loaded subtasks from data attribute:", JSON.stringify(subtasks));
      }
    } catch (innerError) {
      console.error("Error in fallback loading:", innerError);
    }
  }
  
  console.log("Final subtasks to display:", subtasks);
  
  // Display subtasks
  if (subtasks && subtasks.length > 0) {
    subtasks.forEach(sub => {
      addSubtaskToList(sub.text, sub.completed, sub.elapsedTime);
    });
  } else {
    // Show a message if there are no subtasks
    const noSubtasksMessage = document.createElement('div');
    noSubtasksMessage.classList.add('no-subtasks-message');
    noSubtasksMessage.innerText = 'No subtasks yet. Add your first subtask above.';
    subtaskList.appendChild(noSubtasksMessage);
  }
}

function forceRefreshFromStorage() {
  console.log("FORCE REFRESHING task data from localStorage");
  
  // Get current tasks from localStorage
  const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  console.log("Read tasks from localStorage:", tasks.length);
  
  // Update all task elements with the localStorage data
  tasks.forEach(taskData => {
    const taskElement = document.querySelector(`.task[data-taskid="${taskData.taskId}"]`);
    if (taskElement) {
      // Synchronize the data attribute with localStorage
      taskElement.dataset.subtasks = JSON.stringify(taskData.subtasks || []);
      console.log(`Updated task ${taskData.taskId} with subtasks:`, taskData.subtasks);
      
      // If this is the currently selected task, also update the subtasks display
      if (taskData.taskId === currentSelectedTaskId) {
        console.log("This is the current task - updating subtasks display");
        
        // Clear current subtasks
        subtaskList.innerHTML = '';
        
        // Display subtasks from localStorage
        const subtasks = taskData.subtasks || [];
        if (subtasks.length > 0) {
          subtasks.forEach(sub => {
            addSubtaskToList(sub.text, sub.completed, sub.elapsedTime);
          });
        } else {
          // Show a message if there are no subtasks
          const noSubtasksMessage = document.createElement('div');
          noSubtasksMessage.classList.add('no-subtasks-message');
          noSubtasksMessage.innerText = 'No subtasks yet. Add your first subtask above.';
          subtaskList.appendChild(noSubtasksMessage);
        }
      }
    }
  });
}

// Add a subtask to the current selected task
// Replace just these two functions - this is the critical fix

// Add a subtask to the current selected task
function addSubtaskToCurrentTask(text, completed = false, elapsedTime = 0) {
  console.log("Adding subtask to current task:", text);
  
  if (!currentSelectedTaskId) {
    console.error("No task selected");
    return;
  }
  
  // CRITICAL FIX: Use lowercase for attribute selector
  const taskElement = document.querySelector(`[data-taskid="${currentSelectedTaskId}"]`);
  
  // Debug the query selector
  console.log("Looking for task with selector:", `[data-taskid="${currentSelectedTaskId}"]`);
  console.log("All tasks with data-taskid:", Array.from(document.querySelectorAll('[data-taskid]')).map(el => el.dataset.taskId));
  
  if (!taskElement) {
    console.error("Task element not found");
    
    // Alternative approach - try finding by class and checking IDs
    const allTasks = document.querySelectorAll('.task');
    console.log("Looking at all tasks to find ID:", currentSelectedTaskId);
    
    let foundTask = null;
    allTasks.forEach(task => {
      console.log("Task ID:", task.dataset.taskId);
      if (task.dataset.taskId === currentSelectedTaskId) {
        foundTask = task;
      }
    });
    
    if (foundTask) {
      console.log("Found task using alternative method!");
      updateTaskWithSubtask(foundTask, text, completed, elapsedTime);
    } else {
      console.error("Task not found using any method!");
    }
    
    return;
  }
  
  updateTaskWithSubtask(taskElement, text, completed, elapsedTime);
}

// Direct update of task subtasks data - NEW FUNCTION
function updateTaskWithSubtask(taskElement, text, completed = false, elapsedTime = 0) {
  // Add subtask to the list
  const newSubtask = document.createElement('li');
  newSubtask.classList.add('subtask');
  newSubtask.draggable = true;
  
  // Updated HTML structure with normal checkbox and properly functioning delete button
  newSubtask.innerHTML = `
    <label class="subtask-checkbox-container">
      <input type="checkbox" class="subtask-checkbox" ${completed ? 'checked' : ''}>
    </label>
    <span class="subtask-text" contenteditable="true">${text}</span>
    <button class="subtask-delete" onclick="deleteSubtask(this)" aria-label="Delete subtask">
      <i class="fas fa-trash-alt"></i>
    </button>
  `;
  
  subtaskList.appendChild(newSubtask);
  
  // Add event listener directly to the checkbox for toggling completion
  const checkbox = newSubtask.querySelector('.subtask-checkbox');
  checkbox.addEventListener('change', function() {
    toggleSubtaskCompletion(this);
  });
  
  // Add drag and drop functionality
  if (typeof addDragAndDropHandlers === 'function') {
    addDragAndDropHandlers(newSubtask);
  }
  
  // Apply strike-through if completed
  if (completed) {
    newSubtask.querySelector('.subtask-text').classList.add('strike-through');
  }
  
  // Remove the "no subtasks" message if it exists
  const noSubtasksMessage = subtaskList.querySelector('.no-subtasks-message');
  if (noSubtasksMessage) {
    noSubtasksMessage.remove();
  }
  
  // Get all current subtasks
  const allSubtasks = [];
  document.querySelectorAll('#subtask-list .subtask').forEach(subtask => {
    allSubtasks.push({
      text: subtask.querySelector('.subtask-text').innerText,
      completed: subtask.querySelector('.subtask-checkbox').checked,
      elapsedTime: 0
    });
  });
  
  console.log("Updating task with subtasks:", allSubtasks);
  
  // Update task's data attribute
  taskElement.dataset.subtasks = JSON.stringify(allSubtasks);
  
  // Verify update
  console.log("Task data-subtasks now:", taskElement.dataset.subtasks);
  
  // Save to localStorage
  saveToLocalStorage();
}



// Add a subtask to the subtask list
function addSubtaskToList(text, completed = false, elapsedTime = 0) {
  console.log("Adding subtask to list:", text);
  
  const newSubtask = document.createElement('li');
  newSubtask.classList.add('subtask');
  newSubtask.draggable = true;
  
  // Updated HTML structure with normal checkbox and properly functioning delete button
  newSubtask.innerHTML = `
    <label class="subtask-checkbox-container">
      <input type="checkbox" class="subtask-checkbox" ${completed ? 'checked' : ''}>
    </label>
    <span class="subtask-text" contenteditable="true">${text}</span>
    <button class="subtask-delete" onclick="deleteSubtask(this)" aria-label="Delete subtask">
      <i class="fas fa-trash-alt"></i>
    </button>
  `;
  
  subtaskList.appendChild(newSubtask);
  
  // Add event listener directly to the checkbox for toggling completion
  const checkbox = newSubtask.querySelector('.subtask-checkbox');
  checkbox.addEventListener('change', function() {
    toggleSubtaskCompletion(this);
  });
  
  // Add drag and drop functionality
  addDragAndDropHandlers(newSubtask);
  
  // Apply strike-through if completed
  if (completed) {
    newSubtask.querySelector('.subtask-text').classList.add('strike-through');
  }
  
  // Animate the new subtask
  newSubtask.style.opacity = '0';
  newSubtask.style.transform = 'translateY(-5px)';
  
  // Trigger animation after a short delay
  setTimeout(() => {
    newSubtask.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    newSubtask.style.opacity = '1';
    newSubtask.style.transform = 'translateY(0)';
  }, 10);
  
  // Make sure to update the task subtasks data immediately
  if (currentSelectedTaskId) {
    const taskElement = document.querySelector(`.task[data-taskid="${currentSelectedTaskId}"]`);
    if (taskElement) {
      updateTaskSubtasks(taskElement);
    }
  }
}

// Update the selected task's subtasks data
function updateTaskSubtasks(taskElement) {
  if (!taskElement) return;
  
  const subtasks = [];
  
  // Get all subtasks from the subtask list
  const subtaskElements = document.querySelectorAll('#subtask-list .subtask');
  subtaskElements.forEach(subtask => {
    const text = subtask.querySelector('.subtask-text').innerText;
    const completed = subtask.querySelector('.subtask-checkbox').checked;
    
    subtasks.push({
      text: text,
      completed: completed,
      elapsedTime: 0 // We're not tracking time on individual subtasks anymore
    });
  });
  
  console.log("Updating task with subtasks:", subtasks.length);
  
  // Update the task's subtasks data
  taskElement.dataset.subtasks = JSON.stringify(subtasks);
  
  // Double-check to make sure it worked
  console.log("Task data-subtasks after update:", taskElement.dataset.subtasks);
  
  // Save to local storage
  saveToLocalStorage();
}

// Format the expected duration for display
function formatExpectedDuration(totalMinutes) {
  if (totalMinutes <= 0) return "Set time";
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  let result = "";
  if (hours > 0) {
    result += `${hours}h`;
  }
  if (minutes > 0 || hours === 0) {
    result += `${minutes}m`;
  }
  
  return result;
}

// Show dialog to set expected duration
function showDurationDialog(element) {
  // Create the dialog overlay
  const overlay = document.createElement('div');
  overlay.classList.add('duration-overlay');
  
  // Create the dialog content
  const dialog = document.createElement('div');
  dialog.classList.add('duration-dialog');
  
  // Get the current expected duration
  const task = element.closest('.task');
  const expectedDurationInput = task.querySelector('.expected-duration');
  const currentDuration = parseInt(expectedDurationInput.value) || 0;
  
  // Calculate hours and minutes
  const currentHours = Math.floor(currentDuration / 60);
  const currentMinutes = currentDuration % 60;
  
  dialog.innerHTML = `
    <h3>Set Expected Duration</h3>
    <div class="duration-inputs">
      <div class="duration-input-group">
        <label for="duration-hours">Hours</label>
        <input type="number" id="duration-hours" min="0" value="${currentHours}">
      </div>
      <div class="duration-input-group">
        <label for="duration-minutes">Minutes</label>
        <input type="number" id="duration-minutes" min="0" max="59" value="${currentMinutes}">
      </div>
    </div>
    <div class="duration-actions">
      <button class="duration-cancel">Cancel</button>
      <button class="duration-save">Save</button>
    </div>
  `;
  
  // Add the dialog to the overlay
  overlay.appendChild(dialog);
  
  // Add the overlay to the document
  document.body.appendChild(overlay);
  
  // Focus on the hours input
  setTimeout(() => {
    document.getElementById('duration-hours').focus();
  }, 100);
  
  // Set up event listeners
  const hoursInput = dialog.querySelector('#duration-hours');
  const minutesInput = dialog.querySelector('#duration-minutes');
  
  // Handle number input constraints
  hoursInput.addEventListener('input', () => {
    if (hoursInput.value < 0) hoursInput.value = 0;
    // No upper limit on hours
  });
  
  minutesInput.addEventListener('input', () => {
    if (minutesInput.value < 0) minutesInput.value = 0;
    if (minutesInput.value > 59) minutesInput.value = 59;
  });
  
  // Handle cancel button
  dialog.querySelector('.duration-cancel').addEventListener('click', () => {
    overlay.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 200);
  });
  
  // Handle save button
  dialog.querySelector('.duration-save').addEventListener('click', () => {
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const totalMinutes = (hours * 60) + minutes;
    
    // Update the expected duration hidden input
    expectedDurationInput.value = totalMinutes;
    
    // Update the display span with the formatted time
    const durationDisplay = task.querySelector('.expected-duration-display');
    durationDisplay.textContent = formatExpectedDuration(totalMinutes);
    
    // Update clock icon color
    updateClockIconColor(task);
    
    // Animate and close the dialog
    overlay.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 200);
    
    // Save to local storage
    saveToLocalStorage();
  });
  
  // Close when clicking outside the dialog
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 200);
    }
  });
  
  // Handle keyboard shortcuts
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close on Escape key
      overlay.classList.add('fade-out');
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 200);
    } else if (e.key === 'Enter') {
      // Save on Enter key
      dialog.querySelector('.duration-save').click();
    }
  });
}

// Update the clock icon color based on task status
function updateClockIconColor(task) {
  const expectedDuration = parseInt(task.querySelector('.expected-duration').value) || 0;
  const elapsedTime = parseInt(task.querySelector('.task-stopwatch').dataset.time) || 0;
  const expectedSeconds = expectedDuration * 60;
  const isRunning = task.querySelector('.task-stopwatch').dataset.running === "true";
  
  const clockIcon = task.querySelector('.duration-icon');
  const currentClass = clockIcon.className.match(/time-(normal|running|exceeded)/)?.[0];
  
  // Determine new class
  let newClass;
  if (isRunning) {
    newClass = 'time-running';
  } else if (expectedSeconds > 0 && elapsedTime > expectedSeconds) {
    newClass = 'time-exceeded';
  } else {
    newClass = 'time-normal';
  }
  
  // Only update if the class has changed
  if (!currentClass || !currentClass.includes(newClass)) {
    // Remove existing classes
    clockIcon.classList.remove('time-normal', 'time-running', 'time-exceeded');
    
    // Apply appropriate class
    clockIcon.classList.add(newClass);
  }
}

// Toggle task completion
function toggleTaskCompletion(checkbox) {
  const task = checkbox.closest('.task');
  const taskText = task.querySelector('.task-text');
  
  if (checkbox.checked) {
    taskText.classList.add('strike-through');
  } else {
    taskText.classList.remove('strike-through');
  }
  
  saveToLocalStorage();
}

// Toggle subtask completion
// Replace only this one function in your taskFlow.js file

// Fixed toggleSubtaskCompletion function that saves to localStorage
function toggleSubtaskCompletion(checkbox) {
  console.log("FUNCTION CALLED: toggleSubtaskCompletion");
  
  const subtask = checkbox.closest('.subtask');
  const subtaskText = subtask.querySelector('.subtask-text');
  
  // Update visual state
  if (checkbox.checked) {
    subtaskText.classList.add('strike-through');
  } else {
    subtaskText.classList.remove('strike-through');
  }
  
  console.log(`Toggled subtask "${subtaskText.innerText}" to ${checkbox.checked ? 'completed' : 'incomplete'}`);
  
  // IMPORTANT: Update localStorage immediately with the new checkbox state
  if (currentSelectedTaskId) {
    try {
      // Get current tasks from localStorage
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      
      // Find the current task
      const taskIndex = tasks.findIndex(t => t.taskId === currentSelectedTaskId);
      
      if (taskIndex !== -1) {
        // Get all current subtasks from DOM with their current state
        const updatedSubtasks = [];
        document.querySelectorAll('#subtask-list .subtask').forEach(subtaskEl => {
          updatedSubtasks.push({
            text: subtaskEl.querySelector('.subtask-text').innerText,
            completed: subtaskEl.querySelector('.subtask-checkbox').checked,
            elapsedTime: 0
          });
        });
        
        // Update task subtasks
        tasks[taskIndex].subtasks = updatedSubtasks;
        
        // Save back to localStorage
        localStorage.setItem('tasks', JSON.stringify(tasks));
        console.log("Updated checkbox state in localStorage");
        
        // Also update the task's data attribute
        const taskElement = document.querySelector(`.task[data-taskid="${currentSelectedTaskId}"]`);
        if (taskElement) {
          taskElement.dataset.subtasks = JSON.stringify(updatedSubtasks);
        }
      } else {
        console.error("Task not found in localStorage:", currentSelectedTaskId);
      }
    } catch (e) {
      console.error("Error updating checkbox state in localStorage:", e);
    }
  }
}

// Delete a task
function deleteTask(button) {
  const task = button.closest('.task');
  
  // Clear any running timers for this task
  const taskStopwatch = task.querySelector('.task-stopwatch');
  if (taskStopwatch.dataset.timer) {
    clearInterval(taskStopwatch.dataset.timer);
  }
  
  // Animate removal
  task.style.opacity = '0';
  task.style.transform = 'translateX(20px)';
  
  // If this is the selected task, clear the subtasks panel
  if (task.classList.contains('selected')) {
    subtaskList.innerHTML = '';
    currentTaskTitle.innerText = 'No task selected';
    subtaskInput.disabled = true;
    currentSelectedTaskId = null;
  }
  
  // Remove after animation completes
  setTimeout(() => {
    task.remove();
    
    // Hide floating timer if it was for this task
    if (activeStopwatch && !document.body.contains(activeStopwatch)) {
      hideFloatingTimer();
      activeStopwatch = null;
    }
    
    saveToLocalStorage();
  }, 300);
  
  forceRefreshFromStorage();
}

// Delete a subtask
function deleteSubtask(button) {
  // Get the subtask element
  const subtask = button.closest('.subtask');
  if (!subtask) {
    console.error("Could not find subtask element!");
    return;
  }
  
  // Get the subtask text for identification
  const subtaskTextElement = subtask.querySelector('.subtask-text');
  if (!subtaskTextElement) {
    console.error("Could not find subtask text element!");
    return;
  }
  
  const subtaskText = subtaskTextElement.innerText;
  console.log(`DELETING SUBTASK WITH EXACT TEXT: "${subtaskText}"`);
  
  // Get the subtask index in the DOM (for an alternative approach)
  const allSubtasks = Array.from(document.querySelectorAll('#subtask-list .subtask'));
  const subtaskIndex = allSubtasks.indexOf(subtask);
  console.log(`This is subtask number ${subtaskIndex + 1} out of ${allSubtasks.length}`);
  
  // Remove subtask from DOM first
  subtask.remove();
  
  // DIRECT APPROACH: Work directly with localStorage
  try {
    // Get current tasks from localStorage
    const tasksFromStorage = JSON.parse(localStorage.getItem('tasks') || '[]');
    console.log("BEFORE: Tasks in localStorage:", JSON.stringify(tasksFromStorage));
    
    // Find the current task
    const taskIndex = tasksFromStorage.findIndex(task => task.taskId === currentSelectedTaskId);
    
    if (taskIndex !== -1) {
      const task = tasksFromStorage[taskIndex];
      console.log(`Found task "${task.text}" with ID ${task.taskId}`);
      
      if (Array.isArray(task.subtasks)) {
        console.log("Subtasks BEFORE deletion:", JSON.stringify(task.subtasks));
        
        // APPROACH 1: Delete by exact text match
        const subtaskIndexByText = task.subtasks.findIndex(st => st.text === subtaskText);
        
        if (subtaskIndexByText !== -1) {
          console.log(`Found subtask at index ${subtaskIndexByText} with text: "${task.subtasks[subtaskIndexByText].text}"`);
          task.subtasks.splice(subtaskIndexByText, 1);
        } else {
          // APPROACH 2: Delete by position if text match fails
          console.log(`Could not find subtask with exact text: "${subtaskText}"`);
          console.log("All subtask texts:", task.subtasks.map(st => st.text));
          
          if (subtaskIndex !== -1 && subtaskIndex < task.subtasks.length) {
            console.log(`Deleting by position: ${subtaskIndex}`);
            task.subtasks.splice(subtaskIndex, 1);
          } else {
            console.error("Could not delete subtask by position either!");
          }
        }
        
        console.log("Subtasks AFTER deletion:", JSON.stringify(task.subtasks));
        
        // Update the task in storage
        tasksFromStorage[taskIndex] = task;
        
        // Save back to localStorage
        localStorage.setItem('tasks', JSON.stringify(tasksFromStorage));
        console.log("AFTER: Saved tasks to localStorage");
      } else {
        console.error("Task subtasks is not an array:", task.subtasks);
      }
    } else {
      console.error("Could not find task with ID:", currentSelectedTaskId);
    }
  } catch (e) {
    console.error("Error manipulating localStorage:", e);
  }
  
  // FALLBACK APPROACH: Update based on DOM state
  try {
    // Get remaining subtasks from DOM
    const remainingSubtasks = [];
    document.querySelectorAll('#subtask-list .subtask').forEach(subtaskEl => {
      remainingSubtasks.push({
        text: subtaskEl.querySelector('.subtask-text').innerText,
        completed: subtaskEl.querySelector('.subtask-checkbox').checked,
        elapsedTime: 0
      });
    });
    
    console.log("Remaining subtasks in DOM:", JSON.stringify(remainingSubtasks));
    
    // Get the current tasks from localStorage again
    const tasksFromStorage = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    // Find and update the current task
    const taskIndex = tasksFromStorage.findIndex(task => task.taskId === currentSelectedTaskId);
    
    if (taskIndex !== -1) {
      // Update with DOM state
      tasksFromStorage[taskIndex].subtasks = remainingSubtasks;
      
      // Save back to localStorage
      localStorage.setItem('tasks', JSON.stringify(tasksFromStorage));
      console.log("FALLBACK: Updated localStorage with DOM state");
      
      // Update the DOM data attribute
      const taskElement = document.querySelector(`.task[data-taskid="${currentSelectedTaskId}"]`);
      if (taskElement) {
        taskElement.dataset.subtasks = JSON.stringify(remainingSubtasks);
      }
    }
  } catch (e) {
    console.error("Error in fallback approach:", e);
  }
  
  // If this was the last subtask, show the "no subtasks" message
  if (document.querySelectorAll('#subtask-list .subtask').length === 0) {
    const noSubtasksMessage = document.createElement('div');
    noSubtasksMessage.classList.add('no-subtasks-message');
    noSubtasksMessage.innerText = 'No subtasks yet. Add your first subtask above.';
    document.getElementById('subtask-list').appendChild(noSubtasksMessage);
  }
}

// Add a task timer toggle function
function toggleTaskTimer(button) {
  const task = button.closest('.task');
  const stopwatch = task.querySelector('.task-stopwatch');
  
  // Stop any currently running stopwatch
  if (activeStopwatch && activeStopwatch !== stopwatch) {
    const activeButton = activeStopwatch.closest('.task').querySelector('.task-timer-btn');
    
    clearInterval(activeStopwatch.dataset.timer);
    activeStopwatch.dataset.running = "false";
    activeButton.innerHTML = `<i class="fas fa-play"></i>`;
    
    // Record the time log for the stopped timer
    const prevTaskText = activeStopwatch.closest('.task').querySelector('.task-text').innerText;
    
    // Get the elapsed time for this session only
    const sessionTime = parseInt(activeStopwatch.dataset.sessionTime) || 0;
    
    // Record time if session has any duration
    if (sessionTime > 0) {
      recordTimeLog(prevTaskText, "Main Task", sessionTime);
    }
    
    // Reset session time
    activeStopwatch.dataset.sessionTime = "0";
    
    // Hide floating timer if it's visible
    hideFloatingTimer();
  }
  
  if (stopwatch.dataset.running === "true") {
    // Stop the stopwatch
    clearInterval(stopwatch.dataset.timer);
    stopwatch.dataset.running = "false";
    button.innerHTML = `<i class="fas fa-play"></i>`;
    
    // Record the time spent for this session only
    const taskText = task.querySelector('.task-text').innerText;
    const sessionTime = parseInt(stopwatch.dataset.sessionTime) || 0;
    
    // Record time for main task
    if (sessionTime > 0) {
      recordTimeLog(taskText, "Main Task", sessionTime);
    }
    
    // Reset session time
    stopwatch.dataset.sessionTime = "0";
    
    // Hide floating timer
    hideFloatingTimer();
    
    activeStopwatch = null;
  } else {
    // Start the stopwatch
    stopwatch.dataset.running = "true";
    stopwatch.dataset.sessionTime = "0"; // Reset session time
    button.innerHTML = `<i class="fas fa-pause"></i>`;
    startStopwatch(stopwatch);
    
    // Update clock icon color immediately
    updateClockIconColor(task);
    
    // Show floating timer
    showFloatingTimer(task.querySelector('.task-text').innerText, stopwatch);
    
    activeStopwatch = stopwatch;
  }
  
  // Save state
  saveToLocalStorage();
}

// Start the stopwatch timer
function startStopwatch(stopwatch) {
  // Store the start timestamp for this session
  const now = Date.now();
  stopwatch.dataset.startTime = now;
  
  // Get initial elapsed time
  const initialElapsed = parseInt(stopwatch.dataset.time) || 0;
  
  const update = () => {
    // Calculate actual elapsed time based on timestamp
    const currentTime = Date.now();
    const sessionElapsed = Math.floor((currentTime - now) / 1000);
    const totalElapsed = initialElapsed + sessionElapsed;
    
    stopwatch.dataset.time = totalElapsed;
    stopwatch.dataset.sessionTime = sessionElapsed;
    
    // Update display
    updateStopwatchDisplay(stopwatch);
    
    // Update floating timer if this is the active stopwatch
    if (activeStopwatch === stopwatch && floatingTimer) {
      updateFloatingTimerDisplay(stopwatch);
    }
    
    // Only save to localStorage every 30 seconds to improve performance
    if (sessionElapsed % 30 === 0) {
      saveToLocalStorage();
    }
  };
  
  // Update immediately
  update();
  
  // Set interval for display updates
  stopwatch.dataset.timer = setInterval(update, 1000);
}

// Update the stopwatch display
function updateStopwatchDisplay(stopwatch) {
  let elapsedTime = parseInt(stopwatch.dataset.time) || 0;
  let hours = Math.floor(elapsedTime / 3600);
  let minutes = Math.floor((elapsedTime % 3600) / 60);
  let seconds = elapsedTime % 60;
  stopwatch.innerText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Check if this is a task stopwatch - only update colors if needed
  if (stopwatch.classList.contains('task-stopwatch')) {
    // Only update icon color if really needed
    updateClockIconColor(stopwatch.closest('.task'));
  }
}

// Show the floating timer
function showFloatingTimer(taskText, stopwatch) {
  // Create floating timer if it doesn't exist
  if (!floatingTimer) {
    floatingTimer = document.createElement('div');
    floatingTimer.classList.add('floating-timer');
    floatingTimer.innerHTML = `
      <div class="timer-header">
        <span class="timer-task-text"></span>
        <button class="close-timer" onclick="hideFloatingTimer()" aria-label="Close timer">×</button>
      </div>
      <div class="timer-display">00:00:00</div>
    `;
    document.body.appendChild(floatingTimer);
    
    // Make floating timer draggable
    makeFloatingTimerDraggable();
    
    // Position it on the left side of the screen
    floatingTimer.style.left = "20px";
    floatingTimer.style.right = "auto";
  }
  
  // Update task text
  floatingTimer.querySelector('.timer-task-text').innerText = taskText;
  
  // Update timer display
  updateFloatingTimerDisplay(stopwatch);
  
  // Show the timer with animation
  floatingTimer.style.display = 'block';
  floatingTimer.style.opacity = '0';
  
  // Trigger animation after a short delay
  setTimeout(() => {
    floatingTimer.style.opacity = '1';
  }, 10);
}

// Update the floating timer display
function updateFloatingTimerDisplay(stopwatch) {
  if (floatingTimer) {
    const timerDisplay = floatingTimer.querySelector('.timer-display');
    timerDisplay.innerText = stopwatch.innerText;
  }
}

// Hide the floating timer and stop any active timer
function hideFloatingTimer() {
  if (floatingTimer) {
    floatingTimer.style.opacity = '0';
    
    // Always stop the active timer when closing the timer box
    if (activeStopwatch) {
      // Find the play/pause button
      const activeButton = activeStopwatch.closest('.task').querySelector('.task-timer-btn');
      
      // Get the task
      const parentTask = activeStopwatch.closest('.task');
      
      // Record the time spent
      const taskText = parentTask.querySelector('.task-text').innerText;
      const sessionTime = parseInt(activeStopwatch.dataset.sessionTime) || 0;
      
      // Record time if session has any duration
      if (sessionTime > 0) {
        recordTimeLog(taskText, "Main Task", sessionTime);
      }
      
      // Reset session time
      activeStopwatch.dataset.sessionTime = "0";
      
      // Stop the timer
      clearInterval(activeStopwatch.dataset.timer);
      activeStopwatch.dataset.running = "false";
      
      // Update button icon
      activeButton.innerHTML = `<i class="fas fa-play"></i>`;
      
      // Update display
      updateStopwatchDisplay(activeStopwatch);
      
      // Clear active stopwatch reference
      activeStopwatch = null;
    }
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      floatingTimer.style.display = 'none';
    }, 300);
    
    // Save state to localStorage
    saveToLocalStorage();
  }
}

// Make the floating timer draggable
function makeFloatingTimerDraggable() {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = floatingTimer.querySelector('.timer-header');
  
  header.onmousedown = dragMouseDown;
  header.ontouchstart = dragTouchStart;
  
  function dragMouseDown(e) {
    e.preventDefault();
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call a function whenever the cursor moves
    document.onmousemove = elementDrag;
  }
  
  function dragTouchStart(e) {
    const touch = e.touches[0];
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    document.ontouchend = closeTouchDrag;
    document.ontouchmove = elementTouchDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    moveElement();
  }
  
  function elementTouchDrag(e) {
    const touch = e.touches[0];
    pos1 = pos3 - touch.clientX;
    pos2 = pos4 - touch.clientY;
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    moveElement();
  }
  
  function moveElement() {
    // Calculate new position while keeping within viewport
    let newTop = floatingTimer.offsetTop - pos2;
    let newLeft = floatingTimer.offsetLeft - pos1;
    
    // Set boundaries to keep within viewport
    const maxTop = window.innerHeight - floatingTimer.offsetHeight;
    const maxLeft = window.innerWidth - floatingTimer.offsetWidth;
    
    newTop = Math.max(0, Math.min(newTop, maxTop));
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    
    // Apply new position
    floatingTimer.style.top = newTop + "px";
    floatingTimer.style.left = newLeft + "px";
  }
  
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
  
  function closeTouchDrag() {
    document.ontouchend = null;
    document.ontouchmove = null;
  }
}

// Record time log entry to local storage
function recordTimeLog(taskName, subtaskName, duration) {
  // Debug date issue
  console.log("Recording time log with date:", new Date().toISOString());
  
  // Only record if there's actual time spent
  if (duration <= 0) return;
  
  // Get existing logs or initialize new array
  const timeLogs = JSON.parse(localStorage.getItem('timeLogs') || '[]');
  
  // IMPORTANT: Create a fresh date object for today
  const currentDate = new Date();
  
  // Format YYYY-MM-DD using current date
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;
  
  console.log("Current date string:", todayString);
  
  // Create new log entry with clear current date
  const logEntry = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    date: todayString, // Use today's date explicitly
    timestamp: currentDate.toISOString(),
    taskName: taskName,
    subtaskName: subtaskName,
    duration: duration
  };
  
  console.log("New log entry:", logEntry);
  
  // Add to logs
  timeLogs.push(logEntry);
  
  // Filter for only last 7 days
  const filteredLogs = filterLastSevenDays(timeLogs);
  
  // Save back to local storage
  localStorage.setItem('timeLogs', JSON.stringify(filteredLogs));
}

// Helper function to filter logs to last 7 days
function filterLastSevenDays(logs) {
  // Calculate date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Format as YYYY-MM-DD
  const year = sevenDaysAgo.getFullYear();
  const month = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
  const day = String(sevenDaysAgo.getDate()).padStart(2, '0');
  const cutoffDate = `${year}-${month}-${day}`;
  
  console.log("Cutoff date for 7 days:", cutoffDate);
  
  // Filter logs to last 7 days
  return logs.filter(log => {
    // Make sure log has a valid date
    if (!log.date && log.timestamp) {
      // Extract date from timestamp if no date field
      log.date = log.timestamp.split('T')[0];
    }
    
    // Keep only recent logs
    return log.date >= cutoffDate;
  });
}

// A utility function to ensure the time logs are valid and recent
function cleanUpTimeLogs() {
  const timeLogs = JSON.parse(localStorage.getItem('timeLogs') || '[]');
  
  // Keep only the last 7 days of logs
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0];
  
  // Filter out logs older than 7 days
  const recentLogs = timeLogs.filter(log => {
    // Ensure log has valid date property
    if (!log.date) {
      if (log.timestamp) {
        // Extract date from timestamp if available
        log.date = log.timestamp.split('T')[0];
      } else {
        // Skip invalid logs
        return false;
      }
    }
    return log.date >= sevenDaysAgoString;
  });
  
  // Save back to local storage
  localStorage.setItem('timeLogs', JSON.stringify(recentLogs));
  
  return recentLogs.length;
}

// Add drag and drop handlers for subtasks
function addDragAndDropHandlers(item) {
  item.addEventListener('dragstart', () => {
    item.classList.add('dragging');
  });
  
  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    
    console.log("DRAG ENDED - Saving new subtask order");
    
    // Only update if we have a selected task
    if (!currentSelectedTaskId) {
      console.error("No task selected, cannot update subtask order");
      return;
    }
    
    // Get all subtasks in their current order
    const orderedSubtasks = [];
    document.querySelectorAll('#subtask-list .subtask').forEach(subtaskEl => {
      const text = subtaskEl.querySelector('.subtask-text').innerText;
      const completed = subtaskEl.querySelector('.subtask-checkbox').checked;
      
      orderedSubtasks.push({
        text: text,
        completed: completed,
        elapsedTime: 0
      });
    });
    
    console.log("New subtask order:", JSON.stringify(orderedSubtasks));
    
    // DIRECT UPDATE: Modify localStorage immediately
    try {
      // Get current tasks from localStorage
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      
      // Find the current task
      const taskIndex = tasks.findIndex(t => t.taskId === currentSelectedTaskId);
      
      if (taskIndex !== -1) {
        // Update subtasks with new order
        tasks[taskIndex].subtasks = orderedSubtasks;
        
        // Save back to localStorage
        localStorage.setItem('tasks', JSON.stringify(tasks));
        console.log("Saved new order to localStorage");
        
        // Also update the task element data attribute
        const taskElement = document.querySelector(`.task[data-taskid="${currentSelectedTaskId}"]`);
        if (taskElement) {
          taskElement.dataset.subtasks = JSON.stringify(orderedSubtasks);
          console.log("Updated task data attribute with new order");
        }
        
        // Verify the save succeeded
        const verifyTasks = JSON.parse(localStorage.getItem('tasks'));
        const verifyTask = verifyTasks.find(t => t.taskId === currentSelectedTaskId);
        console.log("VERIFICATION - Subtasks in localStorage:", 
          verifyTask ? JSON.stringify(verifyTask.subtasks) : "Task not found");
      } else {
        console.error("Task not found in localStorage:", currentSelectedTaskId);
      }
    } catch (e) {
      console.error("Error updating localStorage:", e);
    }
  });
  
  item.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingItem = document.querySelector('.dragging');
    if (!draggingItem) return;
    
    const subtaskList = item.parentElement;
    const siblings = [...subtaskList.querySelectorAll('.subtask:not(.dragging)')];
    
    let nextSibling = siblings.find(sibling => {
      return e.clientY < sibling.getBoundingClientRect().top + sibling.offsetHeight / 2;
    });
    
    if (nextSibling) {
      subtaskList.insertBefore(draggingItem, nextSibling);
    } else {
      subtaskList.appendChild(draggingItem);
    }
  });
}

// Save all tasks and subtasks to local storage
function saveToLocalStorage() {
  console.log("FUNCTION CALLED: saveToLocalStorage");
  
  const tasks = [];
  
  // Save tasks with subtasks, expected duration, and stopwatch data
  document.querySelectorAll('.task').forEach(task => {
    const taskText = task.querySelector('.task-text').innerText;
    const completed = task.querySelector('.task-checkbox').checked;
    const expectedDuration = task.querySelector('.expected-duration').value || 0;
    const elapsedTime = task.querySelector('.task-stopwatch').dataset.time || 0;
    const taskId = task.dataset.taskId;
    
    // Check if page is being unloaded/refreshed
    const isUnloading = document.visibilityState === 'hidden' || window.isPageUnloading;
    
    // If page is being unloaded, save timers as NOT running
    const isRunning = isUnloading ? false : task.querySelector('.task-stopwatch').dataset.running === "true";
    
    // IMPORTANT: Get subtasks from the data attribute
    let subtasks = [];
    
    try {
      // Check if the subtasks data exists and is not empty
      if (task.hasAttribute('data-subtasks')) {
        const subtasksJSON = task.getAttribute('data-subtasks');
        console.log(`Task ${taskId} has data-subtasks:`, subtasksJSON);
        
        if (subtasksJSON && subtasksJSON.trim() !== '') {
          const parsed = JSON.parse(subtasksJSON);
          if (Array.isArray(parsed)) {
            subtasks = parsed;
          } else {
            console.error("Subtasks is not an array:", parsed);
          }
        }
      } else {
        console.log(`Task ${taskId} has no data-subtasks attribute`);
      }
    } catch (e) {
      console.error("Error parsing subtasks for task:", taskText, e);
    }
    
    // For the currently selected task, double-check against the DOM
    if (taskId === currentSelectedTaskId) {
      console.log("This is the currently selected task - verifying subtasks");
      
      // If this is the selected task, ensure the data reflects the actual DOM state
      const domSubtasks = [];
      document.querySelectorAll('#subtask-list .subtask').forEach(subtaskEl => {
        domSubtasks.push({
          text: subtaskEl.querySelector('.subtask-text').innerText,
          completed: subtaskEl.querySelector('.subtask-checkbox').checked,
          elapsedTime: 0
        });
      });
      
      console.log("Task's subtasks from data attribute:", subtasks);
      console.log("Task's subtasks from DOM:", domSubtasks);
      
      // Always trust the DOM for the currently selected task
      subtasks = domSubtasks;
      
      // Update the data attribute to match
      task.dataset.subtasks = JSON.stringify(subtasks);
    }
    
    console.log(`Saving task "${taskText}" with ${subtasks.length} subtasks`);
    
    tasks.push({ 
      text: taskText, 
      completed, 
      expectedDuration, 
      elapsedTime,
      isRunning,
      subtasks,
      taskId
    });
  });
  
  // Save blockquote content if present
  const blockquote = document.querySelector('.beliefs');
  const blockquoteText = blockquote ? blockquote.innerText.trim() : '';
  
  // Store tasks and blockquote in local storage
  console.log("Saving tasks to localStorage:", tasks);
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('blockquote', blockquoteText);
  
  // Store currently selected task ID
  localStorage.setItem('currentSelectedTaskId', currentSelectedTaskId || '');
  
  // Verify save
  const savedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  console.log("Verified tasks in localStorage:", savedTasks);
  
  console.log("Save to localStorage complete");
}

// Load tasks and subtasks from local storage
function loadFromLocalStorage() {
  const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  
  console.log("Loading tasks from localStorage:", tasks.length);
  
  // Restore tasks with all their properties
  tasks.forEach((task) => {
    addTask(
      task.text, 
      task.completed, 
      task.subtasks || [], 
      task.expectedDuration || 0, 
      task.elapsedTime || 0
    );
    
    // Set task ID if available
    if (task.taskId) {
      const lastTask = document.querySelector('.task:last-child');
      if (lastTask) {
        lastTask.dataset.taskId = task.taskId;
      }
    }
    
    // Update elapsed time display for task but don't start timer
    if (task.isRunning) {
      const taskElement = document.querySelector(`.task[data-taskid="${task.taskId}"]`);
      if (taskElement) {
        const taskStopwatch = taskElement.querySelector('.task-stopwatch');
        // Set to NOT running - overriding the saved state
        taskStopwatch.dataset.running = "false";
        // Just update the display
        updateStopwatchDisplay(taskStopwatch);
      }
    }
  });
  
  // Restore blockquote content
  const blockquote = document.querySelector('.beliefs');
  const savedBlockquoteText = localStorage.getItem('blockquote');
  if (blockquote && savedBlockquoteText) {
    blockquote.innerText = savedBlockquoteText;
  }
  
  // Restore selected task if there was one
  const savedSelectedTaskId = localStorage.getItem('currentSelectedTaskId');
  if (savedSelectedTaskId) {
    const taskElement = document.querySelector(`.task[data-taskid="${savedSelectedTaskId}"]`);
    if (taskElement) {
      selectTask(taskElement);
    }
  }
}

// Generate time report with graph
function generateTimeReport() {
  console.log("Generating time report");
  
  // Create the report overlay
  const overlay = document.createElement('div');
  overlay.classList.add('report-overlay');
  
  // Create the report content
  const reportPanel = document.createElement('div');
  reportPanel.classList.add('report-panel');
  
  // Get time logs
  const timeLogs = JSON.parse(localStorage.getItem('timeLogs') || '[]');
  console.log("Time logs:", timeLogs.length);
  
  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.error("Chart.js is not loaded. Make sure it's included in your HTML.");
    
    // Show a basic report without charts
    reportPanel.innerHTML = `
      <div class="report-header">
        <h2>Time Report</h2>
        <div class="report-header-actions">
          <button class="clear-logs-btn" onclick="clearAllTimeLogs()">
            <i class="fas fa-eraser"></i> Clear Logs
          </button>
          <button class="close-report" onclick="closeTimeReport()" aria-label="Close report">×</button>
        </div>
      </div>
      <div class="report-content">
        <div style="color: red; padding: 20px; text-align: center; background: #ffeeee; border: 1px solid #ffdddd; border-radius: 4px;">
          Chart.js is not loaded. Please make sure it's included in your HTML file:
          <pre style="background: #f8f8f8; padding: 10px; border-radius: 4px; margin-top: 10px;">&lt;script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"&gt;&lt;/script&gt;</pre>
        </div>
        <div class="report-summary">
          <div class="summary-item">
            <h3>Total Logged Time</h3>
            <div class="summary-time">${formatDurationHMS(timeLogs.reduce((total, log) => total + log.duration, 0))}</div>
          </div>
        </div>
      </div>
    `;
    
    // Add to overlay
    overlay.appendChild(reportPanel);
    
    // Add to document
    document.body.appendChild(overlay);
    
    // Make overlay fade in
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 10);
    
    return;
  }
  
  // Group logs by date
  const logsByDate = groupLogsByDate(timeLogs);
  
  // Get the date for today and the past 6 days (for 7 days total)
  const chartLabels = [];
  const chartData = [];
  
  // Get last 7 days (including today)
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    // Format as YYYY-MM-DD to match our log format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Format for display (e.g., "May 4")
    chartLabels.push(formatDateForDisplay(date));
    
    // Get duration for this date or 0 if no data
    const duration = logsByDate[dateString] ? logsByDate[dateString].totalDuration : 0;
    // Convert seconds to hours for better visualization
    chartData.push((duration / 3600).toFixed(2));
  }
  
  console.log("Chart data prepared:", chartLabels, chartData);
  
  // Get total time for past 7 days
  const weeklyTotal = calculateWeeklyTotal(logsByDate);
  
  // Build HTML for the report
  reportPanel.innerHTML = `
    <div class="report-header">
      <h2>Time Report</h2>
      <div class="report-header-actions">
        <button class="clear-logs-btn" onclick="clearAllTimeLogs()">
          <i class="fas fa-eraser"></i> Clear Logs
        </button>
        <button class="close-report" onclick="closeTimeReport()" aria-label="Close report">×</button>
      </div>
    </div>
    <div class="report-content">
      <div class="report-summary">
        <div class="summary-item">
          <h3>Past 7 Days</h3>
          <div class="summary-time">${formatDurationHMS(weeklyTotal)}</div>
        </div>
      </div>
      
      <div class="report-chart-container" style="width: 90%; height: 400px;">
        <canvas id="timeReportChart" width="700" height="350"></canvas>
      </div>
      
      <h3>Daily Time Log</h3>
      <div class="daily-logs">
        ${generateDailyLogs(logsByDate, Object.keys(logsByDate).sort().reverse())}
      </div>
    </div>
  `;
  
  // Add to overlay
  overlay.appendChild(reportPanel);
  
  // Add to document
  document.body.appendChild(overlay);
  
  // Make overlay fade in
  setTimeout(() => {
    overlay.style.opacity = '1';
  }, 10);
  
  // Create chart
  setTimeout(() => {
    try {
      // Get canvas context
      const canvas = document.getElementById('timeReportChart');
      if (!canvas) {
        console.error("Canvas element not found!");
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Could not get canvas context!");
        return;
      }
      
      // Find the maximum value in the data to set appropriate y-axis max
      const maxValue = Math.max(...chartData.map(val => parseFloat(val)), 0.2); // At least 0.2 for visibility
      const yAxisMax = Math.ceil(maxValue * 1.2); // Add 20% padding
      
      // Create the chart
      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartLabels,
          datasets: [{
            label: 'Hours Worked',
            data: chartData,
            backgroundColor: 'rgba(25, 118, 210, 0.6)',
            borderColor: 'rgba(25, 118, 210, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: yAxisMax,
              title: {
                display: true,
                text: 'Hours'
              },
              ticks: {
                callback: function(value) {
                  return value.toFixed(1) + 'h';
                }
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const hours = parseFloat(context.raw);
                  if (hours === 0) return 'No time logged';
                  
                  // Convert back to seconds
                  const seconds = hours * 3600;
                  return formatDurationHMS(seconds);
                },
                title: function(context) {
                  return context[0].label;
                }
              }
            }
          }
        }
      });
      
      console.log("Chart created successfully");
    } catch (error) {
      console.error("Error creating chart:", error);
      
      // Show error message in the chart container
      const chartContainer = document.querySelector('.report-chart-container');
      if (chartContainer) {
        chartContainer.innerHTML = `
          <div style="color: red; padding: 20px; text-align: center;">
            Error creating chart: ${error.message}
          </div>
        `;
      }
    }
  }, 100); // Wait for DOM update
}

// Helper function to format date for display in chart
function formatDateForDisplay(dateInput) {
  let date;
  if (typeof dateInput === 'string') {
    // If it's a string, convert to Date object
    date = new Date(dateInput);
  } else {
    // If it's already a Date object, use as is
    date = dateInput;
  }
  
  // Format as "Month Day" (e.g. "May 5")
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Helper function to group logs by date
function groupLogsByDate(logs) {
  const result = {};
  
  logs.forEach(log => {
    // Get the date (ensure it's in YYYY-MM-DD format)
    const date = log.date || (log.timestamp ? log.timestamp.split('T')[0] : null);
    
    if (!date) return; // Skip logs with no date
    
    if (!result[date]) {
      result[date] = {
        totalDuration: 0,
        tasks: {}
      };
    }
    
    result[date].totalDuration += log.duration;
    
    if (!result[date].tasks[log.taskName]) {
      result[date].tasks[log.taskName] = 0;
    }
    
    result[date].tasks[log.taskName] += log.duration;
  });
  
  return result;
}

// Calculate total for the past 7 days
function calculateWeeklyTotal(logsByDate) {
  let total = 0;
  
  // Calculate the date 7 days ago
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6); // 7 days including today
  
  // Format as YYYY-MM-DD
  const year = sevenDaysAgo.getFullYear();
  const month = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
  const day = String(sevenDaysAgo.getDate()).padStart(2, '0');
  const sevenDaysAgoString = `${year}-${month}-${day}`;
  
  Object.keys(logsByDate).forEach(date => {
    if (date >= sevenDaysAgoString) {
      total += logsByDate[date].totalDuration;
    }
  });
  
  return total;
}

// Generate HTML for daily logs
function generateDailyLogs(logsByDate, sortedDates) {
  if (sortedDates.length === 0) {
    return '<div class="no-data">No time logged yet. Start a timer on any task to begin tracking your time.</div>';
  }
  
  let html = '';
  
  sortedDates.forEach(date => {
    const dayData = logsByDate[date];
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    html += `
      <div class="day-log">
        <div class="day-header">
          <div class="day-date">${formattedDate}</div>
          <div class="day-total">${formatDurationHMS(dayData.totalDuration)}</div>
        </div>
        <div class="day-tasks">
    `;
    
    // Sort tasks by time spent (descending)
    const sortedTasks = Object.entries(dayData.tasks)
      .sort((a, b) => b[1] - a[1]);
    
    sortedTasks.forEach(([taskName, duration]) => {
      html += `
        <div class="day-task">
          <div class="task-name">${taskName}</div>
          <div class="task-time">${formatDurationHMS(duration)}</div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  return html;
}

// Format seconds into HH:MM:SS
function formatDurationHMS(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Close time report
function closeTimeReport() {
  console.log("Closing time report");
  
  const overlay = document.querySelector('.report-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }
}

function addResetTimersButton() {
  // Find the button space
  const buttonSpace = document.querySelector('.button-space');
  if (!buttonSpace) return;
  
  // Create the reset button
  const resetButton = document.createElement('button');
  resetButton.classList.add('reset-timers-btn');
  resetButton.setAttribute('aria-label', 'Reset all timers');
  resetButton.innerHTML = '<i class="fas fa-history"></i>'; // Clock history icon
  
  // Style the button to match others
  resetButton.style.backgroundColor = 'var(--primary-light)';
  resetButton.style.color = 'var(--primary-dark)';
  resetButton.style.padding = '10px';
  resetButton.style.borderRadius = '8px';
  resetButton.style.cursor = 'pointer';
  resetButton.style.fontSize = '18px';
  resetButton.style.border = 'none';
  resetButton.style.display = 'flex';
  resetButton.style.alignItems = 'center';
  resetButton.style.justifyContent = 'center';
  resetButton.style.width = '45px';
  resetButton.style.height = '45px';
  resetButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
  
  // Add hover effect
  resetButton.addEventListener('mouseover', function() {
    this.style.backgroundColor = 'var(--primary-color)';
    this.style.color = 'white';
    this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    this.style.transform = 'translateY(-2px)';
  });
  
  resetButton.addEventListener('mouseout', function() {
    this.style.backgroundColor = 'var(--primary-light)';
    this.style.color = 'var(--primary-dark)';
    this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
    this.style.transform = 'translateY(0)';
  });
  
  // Add click event
  resetButton.addEventListener('click', resetAllTimers);
  
  // Insert as first child (before the other buttons)
  buttonSpace.insertBefore(resetButton, buttonSpace.firstChild);
}

// Reset all task timers to zero
function resetAllTimers() {
  // Confirm before resetting
  if (!confirm('Are you sure you want to reset all task timers to 0? This cannot be undone.')) {
    return;
  }
  
  console.log("Resetting all task timers to zero");
  
  // Stop any running timers first
  document.querySelectorAll('.task-stopwatch[data-running="true"]').forEach(sw => {
    // Find the button to stop the timer
    const button = sw.closest('.task').querySelector('.task-timer-btn');
    if (button) {
      // Trigger a click to properly stop the timer
      button.click();
    } else {
      // Manually stop the timer if button not found
      if (sw.dataset.timer) {
        clearInterval(sw.dataset.timer);
      }
      sw.dataset.running = "false";
    }
  });
  
  // Clear all timers and update the display
  document.querySelectorAll('.task-stopwatch').forEach(sw => {
    // Reset the time to zero
    sw.dataset.time = "0";
    sw.dataset.sessionTime = "0";
    // Update the display
    sw.innerText = "00:00:00";
    
    // Update clock icon color
    updateClockIconColor(sw.closest('.task'));
  });
  
  // Reset in localStorage
  try {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    tasks.forEach(task => {
      task.elapsedTime = "0";
      task.isRunning = false;
    });
    
    localStorage.setItem('tasks', JSON.stringify(tasks));
    console.log("Reset all timers in localStorage");
    
    // Show success message
    alert('All timers have been reset to 0.');
  } catch (e) {
    console.error("Error resetting timers in localStorage:", e);
    alert('Error: Could not reset all timers. Please try again.');
  }
  
  // Hide floating timer if visible
  hideFloatingTimer();
  activeStopwatch = null;
}



// Function to clear all time logs
function clearAllTimeLogs() {
  // Show confirmation dialog
  if (!confirm('Are you sure you want to clear all time logs? This cannot be undone.')) {
    return;
  }
  
  // Remove time logs from localStorage
  localStorage.removeItem('timeLogs');
  
  // Show success message
  alert('All time logs have been cleared successfully.');
  
  // If a time report is currently open, close it
  const reportOverlay = document.querySelector('.report-overlay');
  if (reportOverlay) {
    closeTimeReport();
  }
}

// Clear all tasks
function clearAllTasks() {
  // Confirm before clearing
  if (!confirm('Are you sure you want to clear all tasks? Time logs will be preserved.')) {
    return;
  }
  
  // Clear any running timers
  document.querySelectorAll('.task-stopwatch').forEach(sw => {
    if (sw.dataset.timer) {
      clearInterval(sw.dataset.timer);
    }
  });
  
  // Hide floating timer
  hideFloatingTimer();
  activeStopwatch = null;
  
  // Clear the task list with animation
  const tasks = document.querySelectorAll('.task');
  
  // Animate all tasks
  tasks.forEach(task => {
    task.style.opacity = '0';
    task.style.transform = 'translateY(20px)';
  });
  
  // Clear the subtasks panel
  subtaskList.innerHTML = '';
  currentTaskTitle.innerText = 'No task selected';
  subtaskInput.disabled = true;
  currentSelectedTaskId = null;

  // Remove task-related localStorage entries
  localStorage.removeItem("tasks");
  localStorage.removeItem("currentSelectedTaskId");

  // Clear DOM elements after animation
  setTimeout(() => taskList.innerHTML = '', 300);
}

// Add event listeners to detect page unload/refresh
document.addEventListener('DOMContentLoaded', function() {
  // Flag to track if page is being unloaded
  window.isPageUnloading = false;
  
  // Set flag when page is being unloaded or refreshed
  window.addEventListener('beforeunload', function() {
    window.isPageUnloading = true;
    
    // Stop all running timers before the page unloads
    document.querySelectorAll('.task-stopwatch[data-running="true"]').forEach(sw => {
      if (sw.dataset.timer) {
        clearInterval(sw.dataset.timer);
      }
      sw.dataset.running = "false";
    });
    
    // Set activeStopwatch to null
    activeStopwatch = null;
    
    // Save the state with all timers marked as not running
    saveToLocalStorage();
  });
  
  // Also handle visibility change for browser tab switching
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      // If tab is being hidden, save state but keep timers running
      saveToLocalStorage();
    }
  });
});



