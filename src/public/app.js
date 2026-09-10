const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const currentUserLabel = document.getElementById("current-user");
const logoutButton = document.getElementById("logout-button");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const newExpenseForm = document.getElementById("new-expense-form");
const newExpenseError = document.getElementById("new-expense-error");
const rowsContainer = document.getElementById("expense-rows");
const rowTemplate = document.getElementById("row-template");

let currentUser = null;

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `request failed with ${response.status}`);
  }
  return body;
}

function showApp() {
  loginScreen.hidden = true;
  appScreen.hidden = false;
  currentUserLabel.hidden = false;
  currentUserLabel.textContent = `Signed in as ${currentUser.name} (${currentUser.role})`;
  logoutButton.hidden = false;
}

function money(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

function buildActionsCell(expense) {
  const cell = document.createElement("td");

  const isOwner = expense.userId === currentUser.id;
  const canManage = currentUser.role === "manager" && !isOwner && expense.status === "pending";
  const canEditThis = isOwner && expense.status === "pending";

  if (canManage) {
    const approveButton = document.createElement("button");
    approveButton.type = "button";
    approveButton.textContent = "Approve";
    approveButton.addEventListener("click", () => decide(expense.id, "approve"));
    cell.append(approveButton);

    const rejectButton = document.createElement("button");
    rejectButton.type = "button";
    rejectButton.textContent = "Reject";
    rejectButton.addEventListener("click", () => showRejectForm(cell, expense.id));
    cell.append(rejectButton);
  }

  if (canEditThis) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => showEditForm(cell, expense));
    cell.append(editButton);
  }

  if (!canManage && !canEditThis && expense.status === "rejected" && expense.reason) {
    const reasonText = document.createElement("span");
    reasonText.textContent = `Reason: ${expense.reason}`;
    cell.append(reasonText);
  }

  return cell;
}

function showRejectForm(cell, expenseId) {
  cell.replaceChildren();

  const label = document.createElement("label");
  label.setAttribute("for", `reject-reason-${expenseId}`);
  label.textContent = "Reason";
  const input = document.createElement("input");
  input.id = `reject-reason-${expenseId}`;
  input.type = "text";

  const confirmButton = document.createElement("button");
  confirmButton.type = "button";
  confirmButton.textContent = "Confirm rejection";

  const error = document.createElement("p");
  error.setAttribute("role", "alert");

  confirmButton.addEventListener("click", async () => {
    const reason = input.value.trim();
    if (!reason) {
      error.textContent = "Reason is required to reject an expense.";
      return;
    }
    error.textContent = "";
    await decide(expenseId, "reject", reason);
  });

  cell.append(label, input, confirmButton, error);
}

function showEditForm(cell, expense) {
  cell.replaceChildren();

  const titleLabel = document.createElement("label");
  titleLabel.setAttribute("for", `edit-title-${expense.id}`);
  titleLabel.textContent = "Title";
  const titleInput = document.createElement("input");
  titleInput.id = `edit-title-${expense.id}`;
  titleInput.value = expense.title;

  const amountLabel = document.createElement("label");
  amountLabel.setAttribute("for", `edit-amount-${expense.id}`);
  amountLabel.textContent = "Amount";
  const amountInput = document.createElement("input");
  amountInput.id = `edit-amount-${expense.id}`;
  amountInput.type = "number";
  amountInput.step = "0.01";
  amountInput.value = expense.amount;

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", async () => {
    await api(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: titleInput.value.trim(), amount: Number(amountInput.value) }),
    });
    await loadExpenses();
  });

  cell.append(titleLabel, titleInput, amountLabel, amountInput, saveButton);
}

async function decide(expenseId, action, reason) {
  await api(`/api/expenses/${expenseId}/${action}`, {
    method: "POST",
    body: action === "reject" ? JSON.stringify({ reason }) : undefined,
  });
  await loadExpenses();
}

async function loadExpenses() {
  const { expenses } = await api("/api/expenses");
  rowsContainer.replaceChildren();

  for (const expense of expenses) {
    const fragment = rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector("tr");
    row.querySelector(".cell-title").textContent = expense.title;
    row.querySelector(".cell-category").textContent = expense.category;
    row.querySelector(".cell-amount").textContent = money(expense.amount);
    row.querySelector(".cell-status").textContent = expense.status;
    row.querySelector(".cell-actions").replaceWith(buildActionsCell(expense));
    rowsContainer.append(row);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    const { user } = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    currentUser = user;
    showApp();
    await loadExpenses();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

newExpenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  newExpenseError.textContent = "";
  const title = document.getElementById("new-title").value.trim();
  const amount = Number(document.getElementById("new-amount").value);
  const category = document.getElementById("new-category").value.trim();
  try {
    await api("/api/expenses", { method: "POST", body: JSON.stringify({ title, amount, category }) });
    newExpenseForm.reset();
    await loadExpenses();
  } catch (error) {
    newExpenseError.textContent = error.message;
  }
});

logoutButton.addEventListener("click", () => {
  window.location.reload();
});

async function checkExistingSession() {
  try {
    const { user } = await api("/api/auth/me");
    currentUser = user;
    showApp();
    await loadExpenses();
  } catch {
    // No valid session (or first visit) — the login screen is already the default view.
  }
}

checkExistingSession();
