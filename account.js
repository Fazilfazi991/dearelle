let accountUser = null;
let accountProfile = null;

const authPanel = document.querySelector("[data-account-auth]");
const dashboard = document.querySelector("[data-account-dashboard]");
const notice = document.querySelector("[data-account-notice]");
const profileForm = document.querySelector("[data-profile-form]");
const addressForm = document.querySelector("[data-address-form]");
const addressList = document.querySelector("[data-address-list]");
const orderList = document.querySelector("[data-order-list]");

function accountMessage(message, type = "info") {
  notice.textContent = message;
  notice.dataset.type = type;
}

function friendlyAuthError(message) {
  if (/invalid login credentials/i.test(message || "")) {
    return "Invalid login credentials. Please check your password, create an account first, or confirm your email if you just registered.";
  }
  return message || "Something went wrong. Please try again.";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeText(value) {
  return escapeHtml(value);
}

function safeAttr(value) {
  return escapeHtml(value);
}

function metadata(user) {
  return user?.user_metadata || {};
}

function headers() {
  return {
    Prefer: "return=representation",
    "Content-Type": "application/json"
  };
}

async function loadProfile(user) {
  const rows = await DearelleAuth.rest(`profiles?select=*&id=eq.${encodeURIComponent(user.id)}`);
  accountProfile = rows?.[0] || {
    id: user.id,
    email: user.email,
    first_name: metadata(user).firstName || "",
    last_name: metadata(user).lastName || "",
    phone: metadata(user).phone || ""
  };
  return accountProfile;
}

async function saveProfile(profile) {
  const rows = await DearelleAuth.rest("profiles?on_conflict=id", {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(profile)
  });
  accountProfile = rows?.[0] || profile;
}

async function loadAddresses(user) {
  return DearelleAuth.rest(`user_addresses?select=*&user_id=eq.${encodeURIComponent(user.id)}&order=created_at.desc`);
}

async function loadOrders() {
  const session = DearelleAuth.getSession();
  const response = await fetch("/api/customer?action=orders", {
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Unable to load orders.");
  return payload.orders || [];
}

function fillProfile(user, profile) {
  const firstName = profile.first_name || metadata(user).firstName || "";
  const lastName = profile.last_name || metadata(user).lastName || "";
  document.querySelector("[data-account-name]").textContent = `Welcome${firstName ? `, ${firstName}` : ""}`;
  document.querySelector("[data-account-email]").textContent = user.email || "";
  profileForm.elements.firstName.value = firstName;
  profileForm.elements.lastName.value = lastName;
  profileForm.elements.email.value = user.email || profile.email || "";
  profileForm.elements.phone.value = profile.phone || metadata(user).phone || "";
}

function renderAddresses(addresses) {
  if (!addresses.length) {
    addressList.innerHTML = `<p class="account-empty">No saved address yet.</p>`;
    return;
  }

  addressList.innerHTML = addresses.map((address) => `
    <article>
      <strong>${safeText(address.full_name)}</strong>
      <span>${safeText(address.address)}, ${safeText(address.city)}, ${safeText(address.state)} ${safeText(address.pin)}</span>
      <small>${safeText(address.phone || "")}</small>
      <button type="button" data-edit-address="${safeAttr(address.id)}">Edit</button>
    </article>
  `).join("");
}

function renderOrders(orders) {
  if (!orders.length) {
    orderList.innerHTML = `<p class="account-empty">Your orders will appear here after checkout.</p>`;
    return;
  }

  orderList.innerHTML = orders.map((order) => `
    <article>
      <strong>${safeText(order.id)}</strong>
      <span>${new Date(order.createdAt).toLocaleString()} · ${safeText(order.paymentStatus || "Pending")}</span>
      <small>${(order.items || []).length} item(s) · ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(order.total || 0)}</small>
    </article>
  `).join("");
}

async function showDashboard(user) {
  accountUser = user;
  authPanel.hidden = true;
  dashboard.hidden = false;
  const [profile, addresses, orders] = await Promise.all([
    loadProfile(user),
    loadAddresses(user).catch(() => []),
    loadOrders().catch(() => [])
  ]);
  fillProfile(user, profile);
  renderAddresses(addresses || []);
  renderOrders(orders || []);
}

async function bootAccount() {
  try {
    const user = await DearelleAuth.currentUser();
    if (!user) {
      authPanel.hidden = false;
      dashboard.hidden = true;
      return;
    }
    await showDashboard(user);
  } catch (error) {
    DearelleAuth.clearSession();
    authPanel.hidden = false;
    dashboard.hidden = true;
    accountMessage(error.message, "error");
  }
}

document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await DearelleAuth.signIn(Object.fromEntries(new FormData(event.currentTarget).entries()));
    accountMessage("Logged in successfully.", "success");
    await bootAccount();
  } catch (error) {
    accountMessage(friendlyAuthError(error.message), "error");
  }
});

document.querySelector("[data-register-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const payload = await DearelleAuth.signUp(data);
    if (!payload.access_token) {
      accountMessage("Account created. Please confirm your email if Supabase asks for it, then login.", "success");
      return;
    }
    await saveProfile({
      id: payload.user.id,
      email: payload.user.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || ""
    });
    accountMessage("Account created.", "success");
    await bootAccount();
  } catch (error) {
    accountMessage(friendlyAuthError(error.message), "error");
  }
});

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!accountUser) return;
  const data = Object.fromEntries(new FormData(profileForm).entries());
  try {
    await saveProfile({
      id: accountUser.id,
      email: accountUser.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || "",
      updated_at: new Date().toISOString()
    });
    accountMessage("Profile saved.", "success");
    await bootAccount();
  } catch (error) {
    accountMessage(error.message, "error");
  }
});

addressForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!accountUser) return;
  const data = Object.fromEntries(new FormData(addressForm).entries());
  const payload = {
    user_id: accountUser.id,
    full_name: data.fullName,
    address: data.address,
    city: data.city,
    state: data.state,
    pin: data.pin,
    phone: data.phone || ""
  };
  try {
    if (data.id) {
      await DearelleAuth.rest(`user_addresses?id=eq.${encodeURIComponent(data.id)}&user_id=eq.${encodeURIComponent(accountUser.id)}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(payload)
      });
    } else {
      await DearelleAuth.rest("user_addresses", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload)
      });
    }
    addressForm.reset();
    accountMessage("Address saved.", "success");
    renderAddresses(await loadAddresses(accountUser));
  } catch (error) {
    accountMessage(error.message, "error");
  }
});

addressList?.addEventListener("click", async (event) => {
  const editId = event.target.closest("[data-edit-address]")?.dataset.editAddress;
  if (!editId || !accountUser) return;
  const addresses = await loadAddresses(accountUser);
  const address = addresses.find((item) => item.id === editId);
  if (!address) return;
  addressForm.elements.id.value = address.id;
  addressForm.elements.fullName.value = address.full_name || "";
  addressForm.elements.address.value = address.address || "";
  addressForm.elements.city.value = address.city || "";
  addressForm.elements.state.value = address.state || "";
  addressForm.elements.pin.value = address.pin || "";
  addressForm.elements.phone.value = address.phone || "";
});

document.querySelector("[data-logout]")?.addEventListener("click", async () => {
  await DearelleAuth.signOut();
  accountMessage("Logged out.", "success");
  await bootAccount();
});

bootAccount();
