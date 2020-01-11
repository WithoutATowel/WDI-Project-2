# Harmonize
A full-stack web application that uses the Spotify API to analyze the listening habits of a group of users and automatically generate a recommended playlist. Quickly find music that everyone in a group will enjoy.

***

## USER STORIES
The top level need that Harmonize fulfills is that it makes it easy to put on music when you're entertaining a group of friends. Below is a more specific list of the kinds of actions and paths that users would want to follow while using the app. Developing this list was the foundation against which I later built out wireframes, my route list, and the app itself.
1. As a user who’s using PartyPlaylist for the first time, I want to learn how the app works and sign up using Spotify.
2. As a returning user I want to sign into the app.
3. As a signed in user I want to 
    1. View my profile.
        * After clicking the “profile” tab.
        * After signing up.
    2. Edit my profile.
    3. Delete my profile.
    4. View my playlists.
        * After signing in.
        * When coming back to the website but still signed in.
    5. Generate a new playlist
    6. Save a playlist to Spotify
    7. Delete a playlist
    8. Log out


## WIREFRAMES
For this project I wireframed all screens for desktop and mobile. That's too much to include here, so I've chosen a couple of key examples. Below are the wireframes for the app's landing page and playslists views.

#### Landing Page
The app uses Spotify OAuth for login, and automatically detects whether the user has an existing Harmonize profile.
![alt text](/readme-images/landing.png "Landing page wireframe")
![alt text](/readme-images/landing-mobile.png "Mobile landing page")

#### Playlists Page
This view shows the user a full list of the playlists they've created with the app.
![alt text](/readme-images/playlists.png "Playlists")
![alt text](/readme-images/playlists-mobile.png "Mobile playlists")

#### Further Wireframes
If you'd like to view the full set of frames used for the construction of this app, take a look at this [Google presentation](https://docs.google.com/presentation/d/18Dq2nJO0eImqZkxXiXRSWnaHD_h1VhhrIk2fwR2aTv8/).

***

## ROUTES
The routes for Harmonize provide full CRUD capabilities for user profiles, and CRD routes for playlists. Updates for playlists were beyond the scope of v1 of Harmonize due to the difficulty of keeping exported playlists in sync across the app and Spotify. Adding this capability is high priority for v.Next.

The following routes were organized into four controllers: index, auth, playlists, and profile.

| Verb   | Path                        | Used For |
| ------ |:--------------------------- | :------  |
| GET    | /                           | Loads the landing page with login
| GET    | /auth/spotify               | Creates an initial call to Spotify for OAuth login
| GET    | /auth/spotify/callback      | Route that Spotify calls back to after authenticating. Redirects based on whether the user is logging in for the first time.
| GET    | /auth/logout                | Logs the user out.
| GET    | /profile                    | Loads a page for viewing profile details.
| GET    | /profile/download           | New users are redirected to this route after logging in for the first time. Triggers calls to the Spotify API to download listening history.
| GET    | /profile/ready              | The loading screen pings this route on an interval to check whether it should redirect to the welcome page.
| GET    | /profile/welcome            | A one-time screen that the user sees after logging in for the first time. Explains public names.
| PUT    | /profile                    | Edit route for users to update their public names.
| DELETE | /profile                    | Deletes the user's profile, and all associated playlists.
| GET    | /playlists                  | Shows the user a list of the playlists they've created.
| GET    | /playlists/new              | Loads a form for creating a new playlist.
| POST   | /playlists                  | Creates a new playlist based on data from the creation form.
| GET    | /playlists/:id              | Shows the contents of a specific playlist.
| POST   | /playlists/:id/spotify      | Exports a playlist to Spotify using the API.
| DELETE | /playlists/:id              | Deletes a playlist.


## DATABASE SCHEMA
The database for Harmonize uses 8 models to link four fundamental entities: users, playlists, songs, and artists. As shown below, most of these entities are linked via many to many join tables:
![alt text](/readme-images/schema.png "Database schema")

## PLAYLIST GENERATION
Playlist generation within Harmonize is simple. Once the relevant users have created accounts, a SQL query is used to find songs that two or more members of the playlist group have a strong affiliation with, have saved, or added to a playlist in the past. This approach will be refined over time (see "Future Features" below).

## TECHNOLOGIES USED
* Frontend: HTML, CSS, Sass, Materialize, JavaScript, jQuery
* Backend: Node.js, Express, many modules (see package.json)
* Database: Postgress, Sequelize, SQL
* APIs: Spotify Web API, Wordnik API

## CHALLENGES
The biggest challenge that I faced while building this application was the pagination imposed by the Spotify API. More specifically, the API will truncate results and limits responses for most endpoints to returning a maximum of 50 items. For playlist generation to work properly, I need to download and ingest thousands of songs per user – otherwise the playlist generation query is unlikely to find overlap between users. At 50 songs per call, downloading a user's entire listening history can take up to a minute or two, during which they can't be allowed to access playlist creation controls. This means that, the first time they log in, the user is left at a loading screen for an uncomfortably long time.

## FUTURE FEATURES
There are a lot of additional features I'd like to add to Harmonize. I look forward to adding these in the coming months as time allows:
* Playlist editing: this will be difficult because a playlist that has been exported to Spotify should be kept in sync as edits are made. For the time being, all editing must take place directly within Spotify post-export. So at least there's a workaround!
* Enhanced playlist generation: 
  * If a playlist is small, leverage Spotify's recommendations end point to further populate the list.
  * If a playlist is too large, use Spotify's popularity data to sort the playlist and include more popular songs.
* Friend requests: allow users to add friends and invite users to sign up for Harmonize. 
* Playlist sharing: allow users to share a playlist to a group of friends. Of course, this is dependent on having a friends feature.

## CREDITS | THINGS I USED
* unsplash.com 
  * Campfire photo by Kimson Doan
  * Concert photo by Nainoa Shizuru

node index.js to run locally.
