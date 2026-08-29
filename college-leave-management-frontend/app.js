
const SUPABASE_URL = "https://hkazpnrlbitkbyymnoof.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_N9oiyMHSv3yr7z2IBa7YrQ_0uKsvZ-4";

const DEPARTMENTS = [
  "ECE",
  "CSE",
  "EEE",
  "MECH",
  "CIVIL",
  "IT",
  "AI & DS",
  "AI & ML",
  "MBA",
  "MCA"
];


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const state = {
  user: null,
  profile: null,
  route: "dashboard",
  leaves: [],
  users: []
};

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

function toast(message, type="") {
  const el = $("toast");
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.className = "toast", 3500);
}

function initials(name="User") {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "U";
}

function roleLabel(role) {
  return ({admin:"Administrator", employee:"Employee", hod:"Head of Department", principal:"Principal"})[role] || role;
}

function statusLabel(status) {
  return ({
    pending_hod:"Pending HOD",
    awaiting_principal:"Awaiting Principal",
    approved:"Approved",
    rejected_by_hod:"Rejected by HOD",
    rejected_by_principal:"Rejected by Principal"
  })[status] || status;
}

function statusBadge(status) {
  return `<span class="status ${esc(status)}">${esc(statusLabel(status))}</span>`;
}

function showLogin() {
  $("loginView").classList.remove("hidden");
  $("appView").classList.add("hidden");
}

function showApp() {
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("sideName").textContent = state.profile.full_name;
  $("sideRole").textContent = roleLabel(state.profile.role);
  $("topName").textContent = state.profile.full_name;
  $("topEmail").textContent = state.profile.email;
  $("avatar").textContent = initials(state.profile.full_name);
  $("topAvatar").textContent = initials(state.profile.full_name);
  buildNav();
  navigate("dashboard");
}

function buildNav() {
  const role = state.profile.role;
  const items = [
    ["dashboard","⌂","Dashboard"],
    ...(role === "employee" ? [["apply","＋","Apply for Leave"],["my-leaves","▤","My Applications"]] : []),
    ...(role === "hod" ? [["approvals","✓","Leave Approvals"],["history","▤","Reviewed Leaves"]] : []),
    ...(role === "principal" ? [["approvals","✓","Final Approvals"],["history","▤","Leave History"]] : []),
    ...(role === "admin" ? [["users","♙","User Management"],["applications","▤","All Applications"]] : [])
  ];
  $("nav").innerHTML = items.map(([route,icon,label]) =>
    `<button data-route="${route}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`
  ).join("");
  $("nav").querySelectorAll("button").forEach(b => b.addEventListener("click", () => navigate(b.dataset.route)));
}

async function navigate(route) {
  state.route = route;
  $("nav").querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  const titles = {
    dashboard:"Dashboard", apply:"Apply for Leave", "my-leaves":"My Applications",
    approvals: state.profile.role === "principal" ? "Final Approvals" : "Leave Approvals",
    history:"Leave History", users:"User Management", applications:"All Applications"
  };
  $("pageTitle").textContent = titles[route] || "Dashboard";
  $("pageKicker").textContent = roleLabel(state.profile.role).toUpperCase();
  await renderRoute(route);
}

async function renderRoute(route) {
  const c = $("content");
  c.innerHTML = `<div class="panel"><div class="empty">Loading...</div></div>`;
  try {
    if (route === "dashboard") return renderDashboard();
    if (route === "apply") return renderApply();
    if (route === "my-leaves") return renderMyLeaves();
    if (route === "approvals") return approvalDashboard(state.profile.role === "hod" ? "HOD" : "Principal");
    if (route === "history") return renderHistory();
    if (route === "users") return renderUsers();
    if (route === "applications") return renderAllApplications();
  } catch (e) {
    console.error(e);
    c.innerHTML = `<div class="panel"><div class="empty">Could not load this section.</div></div>`;
    toast(e.message || "Something went wrong.", "error");
  }
}

function renderDashboard() {
  const role = state.profile.role;
  if (role === "employee") return employeeDashboard();
  if (role === "hod") return approvalDashboard("HOD");
  if (role === "principal") return approvalDashboard("Principal");
  return adminDashboard();
}

async function fetchEmployeeLeaves() {
  const { data, error } = await supabaseClient
    .from("leave_applications")
    .select("id,employee_id,leave_type,start_date,end_date,days,reason,class_arrangement,status,hod_decision,hod_remarks,principal_decision,principal_remarks,submitted_at")
    .eq("employee_id", state.user.id)
    .order("submitted_at", { ascending:false });
  if (error) throw error;
  state.leaves = data || [];
  return state.leaves;
}

async function employeeDashboard() {
  const leaves = await fetchEmployeeLeaves();
  const counts = {
    total: leaves.length,
    pending: leaves.filter(x => ["pending_hod","awaiting_principal"].includes(x.status)).length,
    approved: leaves.filter(x => x.status === "approved").length,
    rejected: leaves.filter(x => x.status.startsWith("rejected")).length
  };
  $("content").innerHTML = `
    <div class="welcome">
      <div><div class="eyebrow">EMPLOYEE PORTAL</div><h2>Good day, ${esc(state.profile.full_name.split(" ")[0])}.</h2><p>Track your leave applications and submit new requests.</p></div>
      <button class="btn btn-primary" onclick="navigate('apply')">＋ Apply for Leave</button>
    </div>
    <div class="grid stats">
      ${stat("Total Applications",counts.total,"All submitted requests")}
      ${stat("Pending",counts.pending,"Awaiting a decision")}
      ${stat("Approved",counts.approved,"Final approvals")}
      ${stat("Rejected",counts.rejected,"HOD or Principal")}
    </div>
    <div class="panel">
      <div class="panel-head"><div><h3>Recent Applications</h3><p>Your latest leave requests</p></div><button class="btn btn-light" onclick="navigate('my-leaves')">View all</button></div>
      ${renderLeaveTable(leaves.slice(0,5), false)}
    </div>`;
}

function stat(label,value,hint) {
  return `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${value}</div><div class="hint">${esc(hint)}</div></div>`;
}

function renderLeaveTable(leaves, includeEmployee=true) {
  if (!leaves.length) return `<div class="empty">No leave applications found.</div>`;
  return `<div class="table-wrap"><table><thead><tr>
    ${includeEmployee ? "<th>Employee</th>" : ""}<th>Leave Type</th><th>Dates</th><th>Days</th><th>Status</th><th>Submitted</th>
  </tr></thead><tbody>${leaves.map(l => `<tr>
    ${includeEmployee ? `<td>${esc(l.employee_name || l.employee_id)}</td>` : ""}
    <td><strong>${esc(l.leave_type)}</strong></td>
    <td>${esc(l.start_date)} → ${esc(l.end_date)}</td>
    <td>${l.days}</td><td>${statusBadge(l.status)}</td>
    <td>${new Date(l.submitted_at).toLocaleDateString()}</td>
  </tr>`).join("")}</tbody></table></div>`;
}

function renderApply() {
  $("content").innerHTML = `
    <div class="welcome"><div><div class="eyebrow">NEW REQUEST</div><h2>Apply for leave</h2><p>Complete the form accurately. Your request will first go to the HOD.</p></div></div>
    <div class="two-col">
      <div class="panel"><div class="panel-head"><div><h3>Leave details</h3><p>All fields marked below should be completed.</p></div></div>
        <div class="panel-body">
          <form id="leaveForm">
            <div class="form-grid">
              <div class="form-group"><label>Leave type</label><select id="leaveType"><option>Casual Leave</option><option>Sick Leave</option><option>Earned Leave</option><option>Other</option></select></div>
              <div class="form-group"><label>Number of days</label><input id="days" type="number" min="1" value="1"></div>
              <div class="form-group"><label>Start date</label><input id="startDate" type="date"></div>
              <div class="form-group"><label>End date</label><input id="endDate" type="date"></div>
              <div class="form-group full"><label>Reason</label><textarea id="reason" placeholder="Explain the reason for your leave"></textarea></div>
              <div class="form-group full"><label>Class arrangement</label><textarea id="classArrangement" placeholder="Explain how your classes/work will be managed during your absence"></textarea></div>
            </div>
            <div class="form-actions"><button type="button" class="btn btn-primary" onclick="submitLeave()">Submit Application</button></div>
          </form>
        </div>
      </div>
      <div class="panel"><div class="panel-head"><div><h3>Approval process</h3><p>What happens after submission</p></div></div>
        <div class="panel-body">
          <div class="notice">Your application is reviewed in sequence. The HOD must approve it before it reaches the Principal.</div>
          <div class="details">
            <div class="detail"><small>Step 1</small><strong>HOD Review</strong></div>
            <div class="detail"><small>Step 2</small><strong>Principal Review</strong></div>
            <div class="detail"><small>Result</small><strong>Final Decision</strong></div>
          </div>
          <p class="kpi-note">Submitting a request does not mean leave is approved. Wait for the final status.</p>
        </div>
      </div>
    </div>`;
  const d = new Date(); d.setDate(d.getDate()+1);
  $("startDate").value = d.toISOString().slice(0,10);
  $("endDate").value = d.toISOString().slice(0,10);
}

async function submitLeave() {
  const p = {
    p_leave_type: $("leaveType").value,
    p_start_date: $("startDate").value,
    p_end_date: $("endDate").value,
    p_days: Number($("days").value),
    p_reason: $("reason").value.trim(),
    p_class_arrangement: $("classArrangement").value.trim()
  };
  if (!p.p_start_date || !p.p_end_date || !p.p_reason || !p.p_class_arrangement || !p.p_days || p.p_days < 1) {
    toast("Please complete all leave details.", "error"); return;
  }
  if (p.p_end_date < p.p_start_date) {
    toast("End date cannot be before start date.", "error"); return;
  }
  const { data, error } = await supabaseClient.rpc("submit_leave", p);
  if (error) { console.error(error); toast(error.message, "error"); return; }
  toast("Leave application submitted to the HOD.", "success");
  navigate("my-leaves");
}

async function renderMyLeaves() {
  const leaves = await fetchEmployeeLeaves();
  $("content").innerHTML = `
    <div class="welcome"><div><div class="eyebrow">MY APPLICATIONS</div><h2>Leave history</h2><p>Follow every request from submission to final decision.</p></div><button class="btn btn-primary" onclick="navigate('apply')">＋ New Application</button></div>
    <div class="panel"><div class="panel-head"><div><h3>Applications</h3><p>${leaves.length} total request(s)</p></div></div>${renderLeaveTable(leaves,false)}</div>`;
}

async function fetchRoleLeaves(statuses=null) {
  let q = supabaseClient.from("leave_applications")
    .select("id,employee_id,leave_type,start_date,end_date,days,reason,class_arrangement,status,hod_decision,hod_remarks,hod_reviewed_by,hod_reviewed_at,principal_decision,principal_remarks,principal_reviewed_by,principal_reviewed_at,submitted_at")
    .order("submitted_at",{ascending:true});
  if (statuses) q = q.in("status", statuses);
  const {data,error}=await q;
  if(error) throw error;
  const leaves = data || [];

  const ids = [...new Set(leaves.flatMap(l => [l.employee_id, l.hod_reviewed_by, l.principal_reviewed_by].filter(Boolean)))];
  if (!ids.length) return leaves;

  const {data: profiles, error: profileError} = await supabaseClient
    .from("profiles")
    .select("id,full_name,email,department,role")
    .in("id", ids);
  if (profileError) throw profileError;

  const byId = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  return leaves.map(l => ({
    ...l,
    employee_profile: byId[l.employee_id] || null,
    hod_profile: byId[l.hod_reviewed_by] || null,
    principal_profile: byId[l.principal_reviewed_by] || null
  }));
}

async function approvalDashboard(role) {
  const statuses = role === "HOD" ? ["pending_hod"] : ["awaiting_principal"];
  const leaves = await fetchRoleLeaves(statuses);
  const department = state.profile.department || "Department not assigned";
  const isPrincipal = role === "Principal";
  $("content").innerHTML = `
    <div class="welcome">
      <div>
        <div class="eyebrow">${role.toUpperCase()} PORTAL</div>
        <h2>${role === "HOD" ? "Leave approvals" : "Final approvals"}</h2>
        <p>${isPrincipal ? "Review HOD-approved leave applications from every department." : `Department: <strong>${esc(department)}</strong> · ${leaves.length} application(s) require your attention.`}</p>
      </div>
      ${role === "HOD" ? `<div class="detail"><small>Your Department</small><strong>${esc(department)}</strong></div>` : `<div class="detail"><small>Scope</small><strong>All Departments</strong></div>`}
    </div>
    <div class="grid stats">
      ${stat("Awaiting Review",leaves.length,role==="HOD"?"Pending HOD decision":"HOD-approved requests")}
      ${stat("Approval Stage",role==="HOD"?"HOD":"Principal","Current responsibility")}
      ${stat("Required Action",leaves.length,"Review applications")}
      ${stat("Workflow","2-step","HOD + Principal")}
    </div>
    <div class="panel">
      <div class="panel-head"><div><h3>${role === "HOD" ? `Pending ${esc(department)} HOD applications` : "HOD-approved applications"}</h3><p>${isPrincipal ? "Each request below shows the department and the HOD who approved it." : `Only ${esc(department)} department requests assigned to you are shown.`}</p></div></div>
      <div class="panel-body" id="reviewList">${leaves.length ? leaves.map(renderReviewCard).join("") : `<div class="empty">No applications are waiting for you.</div>`}</div>
    </div>`;
}

function renderReviewCard(l) {
  const employee = l.employee_profile;
  const employeeName = employee?.full_name || l.employee_id;
  const department = employee?.department || "Department not assigned";
  const hod = l.hod_profile;
  const hodName = hod?.full_name || "HOD";
  return `<div class="review-card">
    <div class="review-top"><div><h4>${esc(l.leave_type)} · ${l.days} day(s)</h4><p><strong>${esc(employeeName)}</strong> · Employee ID: ${esc(employee?.employee_id || l.employee_id)}</p></div>${statusBadge(l.status)}</div>
    <div class="details">
      <div class="detail"><small>Department</small><strong>${esc(department)}</strong></div>
      <div class="detail"><small>Start</small><strong>${esc(l.start_date)}</strong></div>
      <div class="detail"><small>End</small><strong>${esc(l.end_date)}</strong></div>
      <div class="detail"><small>Submitted</small><strong>${new Date(l.submitted_at).toLocaleDateString()}</strong></div>
    </div>
    ${state.profile.role === "principal" ? `<div class="reason"><strong>HOD Approval</strong><br>${esc(hodName)}${hod?.department ? ` · ${esc(hod.department)} Department` : ""}${l.hod_reviewed_at ? `<br><span class="kpi-note">Approved on ${new Date(l.hod_reviewed_at).toLocaleDateString()}</span>` : ""}${l.hod_remarks ? `<br><span class="kpi-note">Remarks: ${esc(l.hod_remarks)}</span>` : ""}</div>` : ""}
    <div class="reason"><strong>Reason</strong><br>${esc(l.reason)}</div>
    <div class="reason"><strong>Class arrangement</strong><br>${esc(l.class_arrangement)}</div>
    <div class="action-row">
      <button class="btn btn-success" onclick="openDecision('${l.id}','approved')">Approve</button>
      <button class="btn btn-danger" onclick="openDecision('${l.id}','rejected')">Reject</button>
    </div>
  </div>`;
}

function openDecision(id,decision) {
  $("modalRoot").innerHTML = `<div class="modal-backdrop" onclick="if(event.target===this)closeModal()">
    <div class="modal"><div class="modal-head"><h3>${decision==="approved"?"Approve":"Reject"} Leave Application</h3><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body"><p class="muted">Add an optional remark for the ${state.profile.role === "hod" ? "HOD" : "Principal"} decision.</p>
      <label>Remarks</label><textarea id="decisionRemarks" placeholder="Enter remarks (optional)"></textarea>
      <div class="modal-actions"><button class="btn btn-light" onclick="closeModal()">Cancel</button><button class="btn ${decision==="approved"?"btn-success":"btn-danger"}" onclick="submitDecision('${id}','${decision}')">${decision==="approved"?"Confirm Approval":"Confirm Rejection"}</button></div>
      </div></div></div>`;
}

function closeModal(){ $("modalRoot").innerHTML=""; }

async function submitDecision(id,decision) {
  const remarks = $("decisionRemarks").value.trim() || null;
  const fn = state.profile.role === "hod" ? "hod_review_leave" : "principal_review_leave";
  const {error}=await supabaseClient.rpc(fn,{p_leave_id:id,p_decision:decision,p_remarks:remarks});
  if(error){console.error(error);toast(error.message,"error");return;}
  closeModal();
  toast(`Leave ${decision === "approved" ? "approved" : "rejected"} successfully.`,"success");
  navigate("approvals");
}

async function renderHistory() {
  const leaves = await fetchRoleLeaves(state.profile.role==="hod" ? ["awaiting_principal","rejected_by_hod","approved","rejected_by_principal"] : ["approved","rejected_by_principal"]);
  $("content").innerHTML = `<div class="welcome"><div><div class="eyebrow">HISTORY</div><h2>Reviewed applications</h2><p>Applications that have progressed beyond your pending queue.</p></div></div>
    <div class="panel"><div class="panel-head"><div><h3>Leave history</h3></div></div>${renderLeaveTable(leaves,true)}</div>`;
}

async function renderUsers() {
  const {data,error}=await supabaseClient.from("profiles").select("id,email,full_name,employee_id,department,role,active").order("role").order("full_name");
  if(error) throw error;
  state.users=data||[];
  $("content").innerHTML = `<div class="welcome"><div><div class="eyebrow">ADMINISTRATION</div><h2>User management</h2><p>Create and manage institutional accounts.</p></div><button class="btn btn-primary" onclick="openCreateUser()">＋ Create User</button></div>
    <div class="panel"><div class="panel-head"><div><h3>Registered users</h3><p>${state.users.length} account(s)</p></div><input class="search" id="userSearch" placeholder="Search users..." oninput="filterUsers()"></div><div id="usersTable">${renderUsersTable(state.users)}</div></div>`;
}

function renderUsersTable(users) {
  if(!users.length)return `<div class="empty">No users found.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>User</th><th>Department</th><th>Role</th><th>Status</th></tr></thead><tbody>${users.map(u=>`<tr>
    <td><div class="user-row"><div class="user-dot">${initials(u.full_name)}</div><div><strong>${esc(u.full_name)}</strong><div class="kpi-note">${esc(u.email)}</div></div></div></td>
    <td>${esc(u.department || "—")}</td><td>${esc(roleLabel(u.role))}</td>
    <td>${u.active ? `<span class="status approved">Active</span>` : `<span class="status rejected_by_hod">Inactive</span>`}</td>
  </tr>`).join("")}</tbody></table></div>`;
}

function filterUsers(){
  const term=$("userSearch").value.toLowerCase();
  const filtered=state.users.filter(u => [u.full_name,u.email,u.department,u.role].join(" ").toLowerCase().includes(term));
  $("usersTable").innerHTML=renderUsersTable(filtered);
}

function openCreateUser(){
  $("modalRoot").innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal">
    <div class="modal-head"><h3>Create institutional user</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body"><p class="muted">The account is created through the protected Edge Function. No password is required because the portal uses OTP login.</p>
    <div class="form-grid">
      <div><label>Full name</label><input id="newName"></div>
      <div><label>Email</label><input id="newEmail" type="email"></div>
      <div><label>Employee ID</label><input id="newEmployeeId" placeholder="Optional"></div>
      <div><label>Department</label><select id="newDepartment"><option value="">Select department</option>${DEPARTMENTS.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}</select></div>
      <div class="full"><label>Role</label><select id="newRole"><option value="employee">Employee</option><option value="hod">HOD</option><option value="principal">Principal</option></select></div>
    </div>
    <div class="modal-actions"><button class="btn btn-light" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="createUser()">Create User</button></div>
    </div></div></div>`;
}

async function createUser(){
  const body={
    email:$("newEmail").value.trim().toLowerCase(),
    full_name:$("newName").value.trim(),
    employee_id:$("newEmployeeId").value.trim()||null,
    department:$("newDepartment").value.trim()||null,
    role:$("newRole").value
  };
  if(!body.email||!body.full_name){toast("Name and email are required.","error");return;}
  if((body.role === "employee" || body.role === "hod") && !body.department){toast("Select a department for an Employee or HOD.","error");return;}
  const {data:{session}}=await supabaseClient.auth.getSession();
  const res=await fetch(`${SUPABASE_URL}/functions/v1/create-user`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "apikey":SUPABASE_PUBLISHABLE_KEY,
      "Authorization":`Bearer ${session?.access_token || ""}`
    },
    body:JSON.stringify(body)
  });
  const json=await res.json().catch(()=>({}));
  if(!res.ok){console.error(json);toast(json.error||`Could not create user (${res.status}).`,"error");return;}
  closeModal();toast("User created successfully.","success");renderUsers();
}

async function renderAllApplications(){
  const leaves=await fetchRoleLeaves();
  $("content").innerHTML=`<div class="welcome"><div><div class="eyebrow">ADMINISTRATION</div><h2>All leave applications</h2><p>Institution-wide leave workflow overview.</p></div></div>
    <div class="grid stats">${stat("Total",leaves.length,"Applications")}${stat("Pending HOD",leaves.filter(x=>x.status==="pending_hod").length,"Waiting for HOD")}${stat("Awaiting Principal",leaves.filter(x=>x.status==="awaiting_principal").length,"HOD approved")}${stat("Approved",leaves.filter(x=>x.status==="approved").length,"Final approved")}</div>
    <div class="panel"><div class="panel-head"><div><h3>Application register</h3><p>Current status of all requests</p></div></div>${renderLeaveTable(leaves,true)}</div>`;
}

async function init() {
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(session){
    await loadProfile(session.user);
  } else showLogin();
}

async function loadProfile(user){
  const {data,error}=await supabaseClient.from("profiles").select("id,email,full_name,employee_id,department,role,active").eq("id",user.id).single();
  if(error || !data || !data.active){await supabaseClient.auth.signOut();showLogin();toast("Your active portal profile could not be loaded.","error");return;}
  state.user=user; state.profile=data; showApp();
}

$("sendOtpBtn").addEventListener("click",async()=>{
  const email=$("loginEmail").value.trim().toLowerCase();
  if(!email){toast("Enter your registered email.","error");return;}
  $("sendOtpBtn").disabled=true;
  const {error}=await supabaseClient.auth.signInWithOtp({email,options:{shouldCreateUser:false}});
  $("sendOtpBtn").disabled=false;
  if(error){console.error(error);toast(error.message,"error");return;}
  $("otpArea").classList.remove("hidden");
  toast("OTP sent. Check your email.","success");
  $("otpInput").focus();
});

$("verifyOtpBtn").addEventListener("click",async()=>{
  const email=$("loginEmail").value.trim().toLowerCase();
  const token=$("otpInput").value.trim();
  if(token.length!==8){toast("Enter the complete 8-digit OTP.","error");return;}
  $("verifyOtpBtn").disabled=true;
  const {data,error}=await supabaseClient.auth.verifyOtp({email,token,type:"email"});
  $("verifyOtpBtn").disabled=false;
  if(error){console.error(error);toast(error.message,"error");return;}
  await loadProfile(data.user);
});

$("changeEmailBtn").addEventListener("click",()=>{
  $("otpArea").classList.add("hidden"); $("otpInput").value=""; $("loginEmail").focus();
});

$("logoutBtn").addEventListener("click",async()=>{
  await supabaseClient.auth.signOut();
  state.user=null;state.profile=null;state.route="dashboard";showLogin();toast("Signed out.","success");
});

supabaseClient.auth.onAuthStateChange(async(event,session)=>{
  if(event==="SIGNED_OUT"){state.user=null;state.profile=null;showLogin();}
});

window.navigate=navigate;
window.submitLeave=submitLeave;
window.openDecision=openDecision;
window.closeModal=closeModal;
window.submitDecision=submitDecision;
window.openCreateUser=openCreateUser;
window.createUser=createUser;
window.filterUsers=filterUsers;

init();
