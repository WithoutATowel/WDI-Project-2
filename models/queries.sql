SELECT 
    id, 
    artistId, 
    name, 
    spotifyId, 
    popularity, 
    userId AS user1
FROM songs AS a
LEFT JOIN users_songs ON a.id = users_songs.songId
INNER JOIN (
    SELECT 
        id,
        userId AS user2
    FROM songs
    JOIN users_songs ON songs.id = users_songs.songId
    WHERE userId = {$user2} ) AS b ON a.id = b.id
WHERE userId = {$user1}
