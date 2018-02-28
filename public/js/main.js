$(document).ready(function() {
    $('select').material_select();

    $('.save-to-spotify-link').click(function(event) {
        event.preventDefault();
        // Ping GET playlists/:id/spotify to export
        $.ajax({
            method: "POST",
            url: $(this).attr('href')
        }).done(function() {
        // After the AJAX call comes back, flash a success message?
        });
    });

    $('.delete-playlist-link').click(function(event) {
        event.preventDefault();
        // Ping DELETE /playlists/:id route then redirect to /playlist
        $.ajax({
            method: "DELETE",
            url: $(this).attr('href')
        }).done(function(){
            window.location = '/playlists';
        });
    });

    $('.update-public-name').submit(function(event) {
        event.preventDefault();
        // Ping PUT /profile route with form data
        $.ajax({
            method: "PUT",
            url: $(this).attr('action'),
            data: { publicName: $('#publicName').val() }
        }).done(function() {
        // After the AJAX call comes back, flash a success message?
        });
    });

    $('.delete-profile-link').click(function(event) {
        event.preventDefault();
        // Ping DELETE /profile route then redirect to logout page
        $.ajax({
            method: "DELETE",
            url: $(this).attr('href')
        }).done(function(){
            window.location = '/auth/logout';
        });
    });

    if('logout' in window && logout) {
        $('body').append('<iframe src="https://www.spotify.com/us/logout/" style="display:none;" width="1px" height="1px"></iframe>');
    }
});