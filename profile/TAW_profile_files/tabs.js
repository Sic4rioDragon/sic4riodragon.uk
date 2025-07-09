// Simple tab switcher for dossierhistorytabs and dossierawardstabs

document.addEventListener("DOMContentLoaded", function() {
  // For the main history tabs
  var historyTabs = document.querySelectorAll("#dossierhistorytabs a");
  var historyContent = document.querySelectorAll("#dossierhistorycontent > div");

  historyTabs.forEach(function(tab) {
    tab.addEventListener("click", function(e) {
      e.preventDefault();
      var targetId = this.getAttribute("href").substring(1);

      // Hide all sections
      historyContent.forEach(function(content) {
        content.style.display = "none";
      });

      // Remove active class from all
      historyTabs.forEach(function(t) {
        t.classList.remove("active");
      });

      // Show selected
      var targetDiv = document.getElementById(targetId);
      if (targetDiv) {
        targetDiv.style.display = "block";
      }

      // Set active class
      this.classList.add("active");
    });
  });

  // For the awards tabs (badges, medals, tabs)
  var awardsTabs = document.querySelectorAll("#dossierawardstabs a");
  var awardsContent = document.querySelectorAll("#dossierawardscontent > div");

  awardsTabs.forEach(function(tab) {
    tab.addEventListener("click", function(e) {
      e.preventDefault();
      var targetId = this.getAttribute("href").substring(1);

      awardsContent.forEach(function(content) {
        content.style.display = "none";
      });

      awardsTabs.forEach(function(t) {
        t.classList.remove("active");
      });

      var targetDiv = document.getElementById(targetId);
      if (targetDiv) {
        targetDiv.style.display = "block";
      }

      this.classList.add("active");
    });
  });
});
