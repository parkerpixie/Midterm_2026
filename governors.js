/* Governors on November 3, 2026: 36 U.S. state races.
   Primary sources:
   https://ballotpedia.org/Gubernatorial_elections,_2026
   https://ballotpedia.org/Gubernatorial_battlegrounds,_2026 (October 29 ratings)
   Candidate corroboration: https://www.stateside.com/election/2026-gubernatorial-races
   The candidate snapshot is not a live feed or certified results service.
   Alaska has four round-one ballot choices in the statewide contest. */
(function () {
  const elections = [
    ["AL","Alabama","Kay Ivey","R","Term-limited",[["Doug Jones","D"],["Tommy Tuberville","R"]]],
    ["AK","Alaska","Mike Dunleavy","R","Term-limited",[["Jonathan Kreiss-Tomkins","D"],["David Bronson","R"],["Treg Taylor","R"],["Bernadette Wilson","R"]]],
    ["AZ","Arizona","Katie Hobbs","D","Seeking reelection",[["Katie Hobbs","D"],["Andy Biggs","R"],["Risa Lombardo","Green"],["Teri Hourihan","No Labels"]]],
    ["AR","Arkansas","Sarah Huckabee Sanders","R","Seeking reelection",[["Fredrick Love","D"],["Sarah Huckabee Sanders","R"]]],
    ["CA","California","Gavin Newsom","D","Term-limited",[["Xavier Becerra","D"],["Steve Hilton","R"]]],
    ["CO","Colorado","Jared Polis","D","Term-limited",[["Phil Weiser","D"],["Victor Marx","R"]]],
    ["CT","Connecticut","Ned Lamont","D","Seeking reelection",[["Ned Lamont","D"],["Ryan Fazio","R"]]],
    ["FL","Florida","Ron DeSantis","R","Term-limited",[["David Jolly","D"],["Byron Donalds","R"]]],
    ["GA","Georgia","Brian Kemp","R","Term-limited",[["Keisha Lance Bottoms","D"],["Rick Jackson","R"]]],
    ["HI","Hawaii","Josh Green","D","Seeking reelection",[["Josh Green","D"],["Gary Cordery","R"]]],
    ["ID","Idaho","Brad Little","R","Seeking reelection",[["Terri Pickens","D"],["Brad Little","R"]]],
    ["IL","Illinois","JB Pritzker","D","Seeking reelection",[["JB Pritzker","D"],["Darren Bailey","R"]]],
    ["IA","Iowa","Kim Reynolds","R","Not seeking reelection",[["Rob Sand","D"],["Zach Lahn","R"]]],
    ["KS","Kansas","Laura Kelly","D","Term-limited",[["Cindy Holscher","D"],["Ty Masterson","R"]]],
    ["ME","Maine","Janet Mills","D","Term-limited",[["Hannah Pingree","D"],["Bobby Charles","R"],["Rick Bennett","Independent"]]],
    ["MD","Maryland","Wes Moore","D","Seeking reelection",[["Wes Moore","D"],["Dan Cox","R"]]],
    ["MA","Massachusetts","Maura Healey","D","Seeking reelection",[["Maura Healey","D"],["Michael Minogue","R"]]],
    ["MI","Michigan","Gretchen Whitmer","D","Term-limited",[["Jocelyn Benson","D"],["John James","R"]]],
    ["MN","Minnesota","Tim Walz","D","Not seeking reelection",[["Amy Klobuchar","D"],["Lisa Demuth","R"]]],
    ["NE","Nebraska","Jim Pillen","R","Seeking reelection",[["Lynne Walz","D"],["Jim Pillen","R"]]],
    ["NV","Nevada","Joe Lombardo","R","Seeking reelection",[["Aaron Ford","D"],["Joe Lombardo","R"]]],
    ["NH","New Hampshire","Kelly Ayotte","R","Seeking reelection",[["Cinde Warmington","D"],["Kelly Ayotte","R"]]],
    ["NM","New Mexico","Michelle Lujan Grisham","D","Term-limited",[["Deb Haaland","D"],["Gregg Hull","R"]]],
    ["NY","New York","Kathy Hochul","D","Seeking reelection",[["Kathy Hochul","D"],["Bruce Blakeman","R"]]],
    ["OH","Ohio","Mike DeWine","R","Term-limited",[["Amy Acton","D"],["Vivek Ramaswamy","R"]]],
    ["OK","Oklahoma","Kevin Stitt","R","Term-limited",[["Cyndi Munson","D"],["Mike Mazzei","R"]]],
    ["OR","Oregon","Tina Kotek","D","Seeking reelection",[["Tina Kotek","D"],["Christine Drazan","R"]]],
    ["PA","Pennsylvania","Josh Shapiro","D","Seeking reelection",[["Josh Shapiro","D"],["Stacy Garrity","R"]]],
    ["RI","Rhode Island","Dan McKee","D","Lost party primary",[["Helena Foulkes","D"],["Aaron Guckian","R"]]],
    ["SC","South Carolina","Henry McMaster","R","Term-limited",[["Jermaine Johnson","D"],["Alan Wilson","R"]]],
    ["SD","South Dakota","Larry Rhoden","R","Seeking reelection",[["Dan Ahlers","D"],["Larry Rhoden","R"]]],
    ["TN","Tennessee","Bill Lee","R","Term-limited",[["Jerri Green","D"],["Marsha Blackburn","R"]]],
    ["TX","Texas","Greg Abbott","R","Seeking reelection",[["Gina Hinojosa","D"],["Greg Abbott","R"]]],
    ["VT","Vermont","Phil Scott","R","Seeking reelection",[["Amanda Janoo","D"],["Phil Scott","R"]]],
    ["WI","Wisconsin","Tony Evers","D","Not seeking reelection",[["David Crowley","D"],["Tom Tiffany","R"]]],
    ["WY","Wyoming","Mark Gordon","R","Term-limited",[["Kenneth Casner","D"],["Eric Barlow","R"]]]
  ];
  const battleground = new Set(["AK","AZ","GA","IA","KS","MI","NV","OH","WI"]);
  const slug = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const races = window.MIDTERM_RACES || (window.MIDTERM_RACES=[]);
  const candidates = window.MIDTERM_CANDIDATES || (window.MIDTERM_CANDIDATES={});
  const incumbents = window.MIDTERM_INCUMBENTS || (window.MIDTERM_INCUMBENTS={});
  for (const [state,name,incumbent,incParty,status,field] of elections) {
    const id = "G-"+state;
    races.push({id,chamber:"governor",state,name,title:name,subtitle:"Governor • 2026",
      rating:battleground.has(state)?"Ballotpedia battleground":"Governor election",
      featured:battleground.has(state),source:"Ballotpedia / Stateside"});
    candidates[id]=field.map(([person,p])=>({
      id:id+":"+slug(person),name:person,party:p==="D"?"D":p==="R"?"R":"O",
      partyName:p==="D"?"Democratic":p==="R"?"Republican":p
    }));
    incumbents[id]={name:incumbent,party:incParty,
      status:status==="Seeking reelection"?"running":"not-running",
      note:status==="Seeking reelection"?"":status};
  }
  window.MIDTERM_GOVERNOR_DATA={count:elections.length,battlegrounds:battleground.size};
})();