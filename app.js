const STORAGE_KEY = "weekly-test-portal-records";
const PIN_KEY = "weekly-test-portal-pin";

const sampleRecords = [
  { id: "demo-1", studentId: "12CS001", name: "A. Kavin", className: "12", section: "A", testName: "Weekly Test 1", testDate: "2026-09-07", subject: "Computer Science", score: 48, total: 50 },
  { id: "demo-2", studentId: "12CS001", name: "A. Kavin", className: "12", section: "A", testName: "Weekly Test 1", testDate: "2026-09-07", subject: "Mathematics", score: 46, total: 50 },
  { id: "demo-3", studentId: "12CS002", name: "R. Nithish", className: "12", section: "A", testName: "Weekly Test 1", testDate: "2026-09-07", subject: "Computer Science", score: 42, total: 50 }
];

const getRecords = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : sampleRecords;
  } catch {
    return sampleRecords;
  }
};

let records = getRecords();
let isUnlocked = false;

const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const saveRecords = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", selected);
    });
    panels.forEach((panel) => {
      const selected = panel.id === tab.dataset.panel;
      panel.classList.toggle("active", selected);
      panel.hidden = !selected;
    });
    if (tab.id === "admin-tab") refreshAdminGate();
  });
});

const resultArea = document.querySelector("#result-area");
document.querySelector("#lookup-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const matches = records.filter((record) =>
    normalize(record.studentId) === normalize(data.studentId) &&
    normalize(record.name) === normalize(data.name) &&
    normalize(record.className) === normalize(data.className) &&
    normalize(record.section) === normalize(data.section)
  ).sort((a, b) => new Date(b.testDate) - new Date(a.testDate));

  resultArea.replaceChildren();
  if (!matches.length) {
    const notice = document.createElement("p");
    notice.className = "not-found";
    notice.textContent = "No mark found with these details. Please check the Student ID, name, class and section, or ask your class teacher or class leader.";
    resultArea.append(notice);
    return;
  }

  const card = document.querySelector("#result-template").content.cloneNode(true);
  card.querySelector(".student-result-name").textContent = matches[0].name;
  card.querySelector(".student-result-meta").textContent = `Class ${matches[0].className} · Section ${matches[0].section} · ID ${matches[0].studentId}`;
  const photo = matches.find((record) => record.photo)?.photo;
  const photoElement = card.querySelector(".student-photo");
  const initials = card.querySelector(".student-initials");
  if (photo) {
    photoElement.src = photo;
    photoElement.hidden = false;
    initials.hidden = true;
  } else {
    initials.textContent = matches[0].name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  }
  const list = card.querySelector(".result-list");
  matches.forEach((record) => {
    const line = document.createElement("article");
    line.className = "mark-line";
    line.innerHTML = `
      <div><p class="mark-subject"></p><p class="small-copy"></p></div>
      <p class="small-copy test-label"></p>
      <p class="small-copy date-label"></p>
      <p class="mark-score"></p>`;
    line.querySelector(".mark-subject").textContent = record.subject;
    line.querySelector(".mark-subject + .small-copy").textContent = record.testName;
    line.querySelector(".test-label").textContent = `Class ${record.className} · ${record.section}`;
    line.querySelector(".date-label").textContent = formatDate(record.testDate);
    line.querySelector(".mark-score").textContent = `${record.score}/${record.total}`;
    list.append(line);
  });
  resultArea.append(card);
});

const adminGate = document.querySelector("#admin-gate");
const dashboard = document.querySelector("#dashboard");
const pinLabel = document.querySelector("#pin-label");
const pinInput = document.querySelector("#pin-input");
const pinHelp = document.querySelector("#pin-help");

function refreshAdminGate() {
  const hasPin = Boolean(localStorage.getItem(PIN_KEY));
  adminGate.hidden = isUnlocked;
  dashboard.hidden = !isUnlocked;
  pinLabel.textContent = hasPin ? "Enter your staff PIN" : "Create a staff PIN";
  pinInput.placeholder = hasPin ? "Enter your PIN" : "4 to 12 digits";
  pinInput.autocomplete = hasPin ? "current-password" : "new-password";
  pinHelp.textContent = hasPin ? "Enter the staff PIN created on this browser." : "Use a PIN the class teacher and class leader will remember. It is saved only in this browser.";
  pinHelp.classList.remove("form-error");
  pinInput.value = "";
  if (isUnlocked) renderRecords();
}

document.querySelector("#pin-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const pin = pinInput.value.trim();
  const hasPin = Boolean(localStorage.getItem(PIN_KEY));
  if (!/^\d{4,12}$/.test(pin)) {
    pinHelp.textContent = "PIN must have 4 to 12 numbers.";
    pinHelp.classList.add("form-error");
    return;
  }
  if (hasPin && localStorage.getItem(PIN_KEY) !== pin) {
    pinHelp.textContent = "That PIN is not correct. Please try again.";
    pinHelp.classList.add("form-error");
    return;
  }
  if (!hasPin) localStorage.setItem(PIN_KEY, pin);
  isUnlocked = true;
  refreshAdminGate();
});

document.querySelector("#lock-dashboard").addEventListener("click", () => {
  isUnlocked = false;
  refreshAdminGate();
});

async function compressPhoto(file) {
  if (!file) return null;
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Please select a JPG, PNG or WebP photo.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Photo must be smaller than 8 MB.");
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Photo could not be opened."));
    element.src = source;
  });
  const size = Math.min(320, image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

document.querySelector("#mark-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const photoFile = formData.get("photo");
  const data = Object.fromEntries(formData);
  delete data.photo;
  const score = Number(data.score);
  const total = Number(data.total);
  if (score > total) {
    window.alert("Mark obtained cannot be more than total mark.");
    return;
  }
  let photo = null;
  try {
    photo = await compressPhoto(photoFile?.size ? photoFile : null);
  } catch (error) {
    window.alert(error.message);
    return;
  }
  if (!photo) {
    photo = records.find((record) => normalize(record.studentId) === normalize(data.studentId) && normalize(record.className) === normalize(data.className) && normalize(record.section) === normalize(data.section) && record.photo)?.photo || null;
  }
  records.unshift({ ...data, photo, score, total, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) });
  saveRecords();
  form.reset();
  form.elements.total.value = "50";
  renderRecords();
});

const recordsBody = document.querySelector("#records-body");
const recordCount = document.querySelector("#record-count");
const filter = document.querySelector("#record-filter");
function renderRecords() {
  const term = normalize(filter.value);
  const filtered = records.filter((record) => [record.studentId, record.name, record.subject, record.testName].some((value) => normalize(value).includes(term)));
  recordCount.textContent = `${records.length} mark${records.length === 1 ? "" : "s"} saved`;
  recordsBody.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("tr");
    empty.innerHTML = '<td colspan="5" class="empty-row">No marks match this search.</td>';
    recordsBody.append(empty);
    return;
  }
  filtered.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="table-name"></span><span class="table-sub table-id"></span></td>
      <td><span class="table-test"></span><span class="table-sub table-date"></span></td>
      <td class="table-subject"></td>
      <td class="table-score"></td>
      <td><button class="delete-record" type="button">Delete</button></td>`;
    row.querySelector(".table-name").textContent = record.name;
    row.querySelector(".table-id").textContent = `${record.studentId} · ${record.className}-${record.section}`;
    row.querySelector(".table-test").textContent = record.testName;
    row.querySelector(".table-date").textContent = formatDate(record.testDate);
    row.querySelector(".table-subject").textContent = record.subject;
    row.querySelector(".table-score").textContent = `${record.score}/${record.total}`;
    row.querySelector(".delete-record").addEventListener("click", () => {
      if (!window.confirm(`Delete ${record.name}'s ${record.subject} mark?`)) return;
      records = records.filter((item) => item.id !== record.id);
      saveRecords();
      renderRecords();
    });
    recordsBody.append(row);
  });
}
filter.addEventListener("input", renderRecords);

document.querySelector("#download-data").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `weekly-test-marks-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

refreshAdminGate();
