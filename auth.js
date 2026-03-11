const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    netlifyIdentity.open("login");
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    netlifyIdentity.logout();
  });
}

netlifyIdentity.on("init", user => {

  if(user){
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  }

});

netlifyIdentity.on("login", user => {

  loginBtn.style.display = "none";
  logoutBtn.style.display = "inline-block";

  netlifyIdentity.close();

});

netlifyIdentity.on("logout", () => {

  loginBtn.style.display = "inline-block";
  logoutBtn.style.display = "none";

});

