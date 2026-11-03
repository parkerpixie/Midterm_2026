/* Poll close wave schedule for November 3, 2026.
   Source: https://www.270towin.com/poll-closing-times/
   All times expressed in minutes since 00:00 Tuesday in EST.
   This is a race-management order, not the time an official result will be called.
   Two-time-zone states generally use the latest statewide close; House district exceptions below. */
(function(){
 const et={};
 const groups=[
  [19,"GA SC VA VT"],
  [19.5,"NC OH WV"],
  [20,"AL CT DE FL IL ME MD MA MS MO NH NJ OK PA RI TN"],
  [20.5,"AR"],
  [21,"AZ CO IA KS LA MI MN NE NM NY ND SD TX WI WY"],
  [22,"MT NV UT"],
  [23,"CA ID OR WA"],
  [24,"HI"],
  [25,"AK"]
 ];
 for(const [hour,states] of groups)for(const state of states.split(" ")) et[state]=hour*60;
 Object.assign(et,{IN:19*60,KY:19*60});
 const houseHours={
  "IN-05":18,"KY-06":18,
  "FL-14":19,"FL-22":19,"FL-25":19,"FL-07":19,"FL-09":19,"FL-13":19,"FL-27":19,
  "KS-01":21,"MI-01":21,"TX-23":21,
  "ID-02":22,"ID-01":23
 };
 const lateHouse={};
 for(const [id,hour] of Object.entries(houseHours)) lateHouse["H-"+id]=hour*60;
 // Every IN/KY House district closes at 6 ET except IN-01/08, KY-01/02.
 const closeMinutes=function(race){
  if(race.chamber==="house"){
   if(Object.prototype.hasOwnProperty.call(lateHouse,race.id))return lateHouse[race.id];
   if(race.state==="IN")return /H-IN-(01|08)$/.test(race.id)?19*60:18*60;
   if(race.state==="KY")return /H-KY-(01|02)$/.test(race.id)?19*60:18*60;
   if(race.state==="FL")return /H-FL-(01|02)$/.test(race.id)?20*60:19*60;
   if(race.state==="KS")return race.id==="H-KS-01"?21*60:20*60;
   if(race.state==="MI")return race.id==="H-MI-01"?21*60:20*60;
   if(race.state==="TX")return /H-TX-(16|23)$/.test(race.id)?21*60:20*60;
   if(race.state==="ID")return race.id==="H-ID-01"?23*60:22*60;
  }
  return et[race.state]||21*60;
 };
 const label=function(minutesET){
  const mins=minutesET-60; // Central Standard Time = Eastern Standard Time minus 1 hour
  const h24=Math.floor(mins/60)%24, m=mins%60, h12=h24%12||12;
  return h12+":"+(m?"30":"00")+" "+(h24>=12?"PM":"AM")+" CT"+(mins>=1440?" Wed":"");
 };
 window.MIDTERM_POLLS={closeMinutes,label,source:"https://www.270towin.com/poll-closing-times/"};
})();
