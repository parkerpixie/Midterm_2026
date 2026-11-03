# ✦ The Ballot Board '26

**Two prediction desks. One shared election-night scoreboard.**

A phone-friendly, retro-styled Parker-vs.-Blake 2026 midterm election game. Runs as a static website (no build command, no App Store). The interface works in **local preview** instantly, and switches to **two-account live sync** after Supabase is configured.

## Features

- Separate email magic-link sign-ins for each player.
- Private, two-person shared board with an invitation code.
- Each person can edit **only their own picks**.
- Both players can enter or clear **shared race calls** and **full-chamber seat totals**.
- Realtime cross-device updates through Supabase Postgres Changes.
- Automatic points and prediction accuracy based on manually called winners.
- All **35** Senate elections, with **13** Ballotpedia battlegrounds highlighted.
- **53** competitive House races rated Toss Up, Lean D, or Lean R in Cook's late-October/early-November ratings; **18** House toss-ups appear in Featured.
- Search, chamber filters, called/open/unpicked filters, animated design, and responsive phone layout.
- **No automatic results API.** Manual results are not independently verified by the app.

## ✿ Custom folk-art illustrations

The homepage and party imagery now use Parker's supplied artwork. The HTML/CSS layout is committed, but GitHub's text-only editor connection cannot attach the binary WebP files itself. To finish the images:

1. Download **ballot-board-art-assets.zip** from the ChatGPT response and unzip it.
2. Open the GitHub [assets directory](https://github.com/parkerpixie/Midterm_2026/tree/main/assets).
3. Select **Add file → Upload files**. Upload the **three WebP files** from the extracted assets folder, then **Commit changes**.
4. If Netlify is connected to GitHub, the images appear after the next deployment.

See [assets/README.md](assets/README.md) for file names and details.

## Open it tonight, fast

### 1. Deploy the GitHub repository to Netlify

1. In [Netlify](https://app.netlify.com/), choose **Add new project → Import an existing project**.
2. Choose **GitHub**, authorize if needed, and pick **parkerpixie/Midterm_2026**.
3. Set **build command** to *blank*. Set **publish directory** to the repository root (a single dot).
4. Deploy. Netlify will give you a link to open on either phone.

**At this point it is a preview only.** Switching Parker and Blake in Players changes a local persona, not a real signed-in user, and does **not** synchronize devices.

### 2. Add Supabase to enable actual users and sync

Use a **dedicated Supabase project** if possible, so it doesn't alter an older app. Supabase project availability/pricing depends on your account.

1. In [Supabase](https://supabase.com/dashboard), create or choose the project you've authorized for The Ballot Board.
2. Open **SQL Editor** and run the entire [schema.sql](schema.sql) script once.
3. Open **Project Settings → API Keys** (name may vary) and copy the **Project URL** and **publishable key**. A legacy anon key can also work. **Never put a secret/service_role key in this repository.**
4. Edit [config.js](config.js) on GitHub and fill in the two public values: the project URL in **supabaseUrl** and the publishable key in **publishableKey**.
5. Under **Authentication → URL Configuration** in Supabase, set **Site URL** to your actual Netlify address, and add that origin to **Redirect URLs** (for example, the full Netlify domain followed by /**).
6. Ensure **Email** authentication is enabled. Default Supabase email magic links are fine for two users, subject to your project's email sending limits.
7. Let Netlify redeploy from the GitHub commit to config.js, then refresh the app.

### 3. Start the household showdown

- **Parker:** Open the Netlify URL on your phone. Select **Players**, enter your email, follow the sign-in link, choose your display name, and **Create our board**.
- Tap **Share our board** and send the invitation link to Blake.
- **Blake:** Open that link on his phone, sign in using **his own email**, enter his display name, and join the shared board using the prefilled invitation code.
- Now each player edits only their own predictions. Race calls and chamber totals belong to the shared board and update on both phones.

## How scoring and control work

A correct prediction earns one point after a player manually enters a called party for the race. Accuracy = correctly predicted called races / predicted races with a call. Races without entered results are not scored. D, R, and Other are available; a winner's party is not prefilled.

**The House/Senate big counters are NOT calculated from the featured-race cards.** The House has 435 elections, but this game follows only 53 competitive House districts. Instead, manually enter published **full-chamber called-seat totals** using "Update called-seat totals." That prevents the app from claiming control based on a partial watchlist.

For the Senate, the Democratic side is labeled **D + caucusing independents**; input those as one total. For 2026, a 50–50 tie is decided by the Republican vice president. The app distinguishes a reached threshold from an unconfirmed outcome.

The built-in categories are **external, dated watchlists**, not our forecasts or endorsements:
- Senate election dates and 13 battlegrounds: [Ballotpedia: U.S. Senate battlegrounds 2026](https://ballotpedia.org/U.S._Senate_battlegrounds,_2026), checked Nov. 3, 2026.
- House Toss Up / Lean categories: [Cook Political Report: House race ratings](https://www.cookpolitical.com/ratings/house-race-ratings), as seen Oct. 30–Nov. 2, 2026.

Results are **manually entered by players** and may contain errors; verify all calls through trustworthy election coverage before entering them. This is a game and an unofficial tracker, not an official election-results service.

## File guide

| File | Purpose |
|---|---|
| index.html | App structure and accessible dialogs |
| styles.css | Custom election-night graphics and mobile design |
| races.js | Hand-maintained election watchlist |
| app.js | Predictions, results, scoring, auth, sync |
| config.js | Two public Supabase connection values |
| schema.sql | Database tables, invite RPC, member-only RLS, Realtime |
| icon.svg | Custom ballot favicon |

## Security and privacy

- No passwords stored in this app. Supabase Auth handles login.
- Invite-only private rooms: 10-character randomly generated room codes; maximum two members.
- Database RLS prevents any player from modifying the other player's picks.
- Only members can see board data. The shared room stores email-account UUIDs and chosen display names, not email addresses.
- The **publishable key is public by design**; never use a privileged key in a website.
