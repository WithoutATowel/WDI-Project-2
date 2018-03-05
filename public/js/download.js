$(document).ready(function() {
    // Create an interval that pings the server every second to ask if the profile is ready
    // a.k.a. songs have been downloaded. This hits a dedicated route which checks the user table
    // for a "songDataDownloaded" boolean.
    var myInt = setInterval(function(){
        $.ajax({
            method: 'GET',
            url: '/profile/ready'
        }).done(function(data) {
            if(data === 'Naw dawg'){
                // Not yet ready
                console.log(data);
            } else if (data === 'Download complete') {
                window.location = '/profile/welcome';
            }
        });
    }, 1000);
});