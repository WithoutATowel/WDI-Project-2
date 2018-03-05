$(document).ready(function() {
    // Initialize Materialize "multiple select" inputs and sideNav for mobile. 
    $('select').material_select();
    $('.button-collapse').sideNav();

    // Event handler for the "Export to Spotify" button on the "view playlist" page
    $('.save-to-spotify-link').click(function(event) {
        if ($(this).attr('href').search('open') !== -1) {
            // Button links to Spotify, so do nothing. Let the click go through.
        } else {
            event.preventDefault();
            $(this).attr('disabled', 'disabled');
            // Ping GET playlists/:id/spotify to export
            $.ajax({
                method: 'POST',
                url: $(this).attr('href')
            }).done(function() {
                // Reload the page to show flash message
                window.location.reload();
            });
        }
    });

    // Event handler for the "Delete playlist" button on the "view playlist" page
    $('.delete-playlist-link').click(function(event) {
        event.preventDefault();
        // Ping DELETE /playlists/:id route then redirect to /playlist
        $.ajax({
            method: 'DELETE',
            url: $(this).attr('href')
        }).done(function(){
            // Reload the page to remove playlist from table
            window.location = '/playlists';
        });
    });

    // Event handler for the "Update" button on the profile page
    $('.update-public-name').submit(function(event) {
        event.preventDefault();
        // Ping PUT /profile route with form data
        $.ajax({
            method: 'PUT',
            url: $(this).attr('action'),
            data: { publicName: $('#public-name').val() }
        }).done(function() {
            // Reload the page to show flash message
            window.location.reload();
        });
    });

    // Event handler for the "Delete" button on the profile page
    $('.delete-profile-link').click(function(event) {
        event.preventDefault();
        // Ping DELETE /profile route then redirect to logout page
        $.ajax({
            method: 'DELETE',
            url: $(this).attr('href')
        }).done(function(){
            window.location = '/auth/logout';
        });
    });

    // On page load, check to see if the user just logged out of Harmonize. If so, use an iframe to log them out of Spotify.
    // Not positive this is best practice, but without it you aren't prompted for a password when logging back into Harmonize.
    // I.e. you log out, then hitting "log in" takes you straight through without needing to type in a password.
    if('logout' in window && logout) {
        $('body').append('<iframe src="https://www.spotify.com/us/logout/" style="display:none;" width="1px" height="1px"></iframe>');
    }

    // This fixes a bug with Materialize's select multiple menus on Mobile. Without it, you can't click out of the select menu.
    $(document).on('touchstart', function (e) {
        let target = $(e.target);
        if (!target.is('span')) { //checking if you are tapping on items in multiple select or not
            $(document).trigger('click'); //if you are tapping outside multiple select close it
            $(':focus').blur(); //focus out for multiple select so you can choose another or the same (in case you have more multiple selects on page)
        }
    });

});