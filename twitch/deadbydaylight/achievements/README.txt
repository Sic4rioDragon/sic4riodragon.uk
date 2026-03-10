Dead by Daylight achievements page for sic4riodragon.uk

Recommended live file layout:

/deadbydaylight/achievements/index.html
/deadbydaylight/achievements/achievements.css
/deadbydaylight/achievements/achievements.js
/deadbydaylight/data/achievements/survivors.json
/deadbydaylight/data/achievements/killers.json

This version is integrated to the main Dead by Daylight site style by:
- using the /deadbydaylight/ URL structure
- linking back to Home / Survivors / Killers / Challenges
- expecting your shared site background at:
  /deadbydaylight/assets/img/background.jpg
- using your existing avatar-style side images at:
  /deadbydaylight/assets/img/yui.png
  /deadbydaylight/assets/img/huntress.png

If your actual background filename is different, only change this line in achievements.css:
url('/deadbydaylight/assets/img/background.jpg')

Behavior:
- all achievements in the JSON are treated as locked until you set unlocked:true
- unlocked:true hides the achievement from the page
- survivors render first
- killers render second
- search filters both sides
- progress can be hidden with the checkbox
