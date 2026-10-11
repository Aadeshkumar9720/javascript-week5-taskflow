const STORAGE_KEY = "taskflow-week5-tasks";
let tasks = loadTasks();
let editingId = null;

const $ = (selector) => document.querySelector(selector);
const taskList = $("#taskList");
const emptyState = $("#emptyState");
const modal = $("#modal");

function seedTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Complete JavaScript Week 5 project",
      description: "Build and test the interactive task manager.",
      category: "Study",
      priority: "high",
      due: todayPlus(1),
      completed: false,
      createdAt: Date.now() - 3000,
    },
    {
      id: crypto.randomUUID(),
      title: "Review DOM and event concepts",
      description: "Practice event listeners, forms and dynamic rendering.",
      category: "Study",
      priority: "medium",
      due: todayPlus(2),
      completed: true,
      createdAt: Date.now() - 2000,
    },
    {
      id: crypto.randomUUID(),
      title: "Prepare GitHub submission",
      description: "Check README and repository files before submission.",
      category: "Project",
      priority: "low",
      due: todayPlus(4),
      completed: false,
      createdAt: Date.now() - 1000,
    },
  ];
}
function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : seedTasks();
  } catch {
    return seedTasks();
  }
}
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      })[c],
  );
}
function formatDate(date) {
  if (!date) return "No due date";
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function priorityRank(p) {
  return { high: 3, medium: 2, low: 1 }[p] || 0;
}
function getVisibleTasks() {
  const search = $("#searchInput").value.trim().toLowerCase();
  const filter = $("#filterSelect").value;
  const sort = $("#sortSelect").value;
  let result = tasks.filter((t) =>
    `${t.title} ${t.description} ${t.category}`.toLowerCase().includes(search),
  );
  if (filter === "pending") result = result.filter((t) => !t.completed);
  if (filter === "completed") result = result.filter((t) => t.completed);
  if (filter === "high") result = result.filter((t) => t.priority === "high");
  result.sort((a, b) => {
    if (sort === "oldest") return a.createdAt - b.createdAt;
    if (sort === "priority")
      return priorityRank(b.priority) - priorityRank(a.priority);
    if (sort === "due") return (a.due || "9999").localeCompare(b.due || "9999");
    return b.createdAt - a.createdAt;
  });
  return result;
}
function render() {
  const visible = getVisibleTasks();
  taskList.innerHTML = visible
    .map(
      (t) => `<article class="task-card ${t.completed ? "completed" : ""}">
    <button class="check ${t.completed ? "done" : ""}" data-action="toggle" data-id="${t.id}" aria-label="${t.completed ? "Mark pending" : "Mark completed"}">${t.completed ? "✓" : ""}</button>
    <div><h3 class="task-title">${escapeHtml(t.title)}</h3><p class="task-desc">${escapeHtml(t.description || "No description")}</p><div class="tags"><span class="tag">${escapeHtml(t.category)}</span><span class="tag ${t.priority}">${escapeHtml(t.priority)} priority</span><span class="tag">Due: ${formatDate(t.due)}</span></div></div>
    <div class="task-actions"><button class="small-btn" data-action="edit" data-id="${t.id}">Edit</button><button class="small-btn delete" data-action="delete" data-id="${t.id}">Delete</button></div>
  </article>`,
    )
    .join("");
  emptyState.classList.toggle("hidden", visible.length !== 0);
  taskList.classList.toggle("hidden", visible.length === 0);
  updateStats();
}
function updateStats() {
  const total = tasks.length,
    done = tasks.filter((t) => t.completed).length,
    pending = total - done,
    high = tasks.filter((t) => t.priority === "high" && !t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("#totalCount").textContent = total;
  $("#completedCount").textContent = done;
  $("#pendingCount").textContent = pending;
  $("#highCount").textContent = high;
  $("#heroTotal").textContent = total;
  $("#heroDone").textContent = done;
  $("#heroPending").textContent = pending;
  $("#heroProgress").textContent = `${pct}%`;
  $("#heroProgressBar").style.width = `${pct}%`;
}
function openModal(task = null) {
  editingId = task?.id || null;
  $("#modalTitle").textContent = task ? "Edit task" : "Add a new task";
  $("#taskId").value = task?.id || "";
  $("#titleInput").value = task?.title || "";
  $("#descriptionInput").value = task?.description || "";
  $("#categoryInput").value = task?.category || "Study";
  $("#priorityInput").value = task?.priority || "medium";
  $("#dueInput").value = task?.due || "";
  $("#formError").textContent = "";
  modal.classList.remove("hidden");
  setTimeout(() => $("#titleInput").focus(), 0);
}
function closeModal() {
  modal.classList.add("hidden");
  editingId = null;
}
function submitTask(event) {
  event.preventDefault();
  const title = $("#titleInput").value.trim();
  const due = $("#dueInput").value;
  if (!title) {
    $("#formError").textContent = "Please enter a task title.";
    return;
  }
  if (due && due < todayPlus(0)) {
    $("#formError").textContent = "Due date cannot be in the past.";
    return;
  }
  const data = {
    title,
    description: $("#descriptionInput").value.trim(),
    category: $("#categoryInput").value,
    priority: $("#priorityInput").value,
    due,
  };
  if (editingId) {
    const task = tasks.find((t) => t.id === editingId);
    Object.assign(task, data);
  } else {
    tasks.push({
      id: crypto.randomUUID(),
      ...data,
      completed: false,
      createdAt: Date.now(),
    });
  }
  saveTasks();
  render();
  closeModal();
}
function handleTaskAction(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  if (btn.dataset.action === "toggle") task.completed = !task.completed;
  if (btn.dataset.action === "edit") openModal(task);
  if (btn.dataset.action === "delete" && confirm(`Delete “${task.title}”?`))
    tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}
$("#addTaskBtn").addEventListener("click", () => openModal());
$("#emptyAddBtn").addEventListener("click", () => openModal());
$("#closeModal").addEventListener("click", closeModal);
$("#cancelBtn").addEventListener("click", closeModal);
$("#modalBackdrop").addEventListener("click", closeModal);
$("#taskForm").addEventListener("submit", submitTask);
taskList.addEventListener("click", handleTaskAction);
["searchInput", "filterSelect", "sortSelect"].forEach((id) =>
  document.getElementById(id).addEventListener("input", render),
);
$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  $("#themeToggle").textContent = document.body.classList.contains("dark")
    ? "☀"
    : "☾";
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});
render();
