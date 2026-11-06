import { supabase } from "./supabase";

const app = document.getElementById("app")!;

function showLogin(message = "") {
  app.innerHTML = `
    <h1>Ethiopian Payroll</h1>
    <form id="login">
      <p><input id="email" type="email" placeholder="Email" required></p>
      <p><input id="password" type="password" placeholder="Password" required></p>
      <p><button type="submit">Sign in</button></p>
      <p id="msg" style="color:#b00020"></p>
    </form>`;
  document.getElementById("msg")!.textContent = message;

  document.getElementById("login")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (document.getElementById("email") as HTMLInputElement).value;
    const password = (document.getElementById("password") as HTMLInputElement).value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showLogin(error.message);
    else showHome();
  });
}

async function showHome() {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, company_id")
    .single();

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .single();

  const { data: rates } = await supabase
    .from("rate_schedules")
    .select("effective_from");

  app.innerHTML = `
    <h1>Ethiopian Payroll</h1>
    <p id="who"></p>
    <p id="rates"></p>
    <button id="out">Sign out</button>`;

  document.getElementById("who")!.textContent = profile
    ? `Signed in as ${profile.full_name} (${profile.role}) at ${company?.name ?? "no company"}`
    : "Signed in, but no profile row was found. Check Supabase.";
  document.getElementById("rates")!.textContent =
    `Rate schedules visible: ${rates?.length ?? 0}`;

  document.getElementById("out")!.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showLogin();
  });
}

supabase.auth.getSession().then(({ data }) => {
  if (data.session) showHome();
  else showLogin();
});