// Nonpartisan, dated watchlists: 35 Senate elections (Ballotpedia) plus
// 53 House races rated Toss Up or Lean D/R by Cook Political Report, Oct 30-Nov 2 2026.
// This is a hand-maintained race list, NOT a live data feed or a forecast.
(function () {
  const states = {
    AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
    CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
    HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",
    KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",
    MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",
    NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",
    NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
    OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",
    TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",
    WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"
  };
  const senateAbbr = "AL AK AR CO DE FL GA ID IL IA KS KY LA ME MA MI MN MS MT NE NH NJ NM NC OH OK OR RI SC SD TN TX VA WV WY".split(" ");
  const senateBattlegrounds = new Set("AK FL GA IA KS ME MI MT NE NH NC OH TX".split(" "));
  const senate = senateAbbr.map(function (abbr) {
    const special = abbr === "FL" || abbr === "OH";
    return {
      id:"S-" + abbr, chamber:"senate", state:abbr, name:states[abbr],
      title:states[abbr], subtitle:special ? "Special election" : "U.S. Senate",
      rating:senateBattlegrounds.has(abbr) ? "Ballotpedia battleground" : "Senate election",
      featured:senateBattlegrounds.has(abbr), source:"Ballotpedia"
    };
  });
  const houseGroups = {
    "Toss Up":"CA-22 CO-05 FL-14 FL-22 IA-02 KY-06 MI-04 MI-07 MI-10 MT-01 NC-01 NY-17 OH-07 PA-01 SC-01 TX-35 TX-15 VA-01",
    "Lean D":"AZ-01 AZ-06 CA-48 CO-08 FL-25 IA-01 IA-03 NC-11 NJ-07 NM-02 OH-09 PA-07 PA-08 PA-10 TX-34 VA-02 WA-03 WI-03",
    "Lean R":"AK-AL AL-02 AZ-02 CO-04 FL-07 FL-09 FL-13 FL-27 IN-05 ME-02 MN-01 NV-02 NY-21 OH-10 OH-15 TX-23 WI-01"
  };
  const house = [];
  Object.keys(houseGroups).forEach(function (rating) {
    houseGroups[rating].split(" ").forEach(function (district) {
      const abbr = district.split("-")[0];
      house.push({
        id:"H-" + district, chamber:"house", state:abbr, name:states[abbr],
        title:district, subtitle:states[abbr] + " • U.S. House",
        rating:rating, featured:rating === "Toss Up", source:"Cook Political Report"
      });
    });
  });
  window.MIDTERM_RACES = senate.concat(house);
  window.MIDTERM_DATA_SOURCES = {
    senate:"https://ballotpedia.org/U.S._Senate_battlegrounds,_2026",
    house:"https://www.cookpolitical.com/ratings/house-race-ratings"
  };
})();
