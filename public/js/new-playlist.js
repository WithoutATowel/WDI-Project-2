$(document).ready(function() {
    console.log('all hooked up');
    $('select').material_select();
    $('#members').on('change', function() {
        $("#multi-select-error").text("");
    });
    $('#new-playlist-form').on('submit', function(e) {
        if ($("#members").val().length < 2) {
            e.preventDefault();
            $("#multi-select-error").text("Choose one or more members to create a playlist.");
        } else {
            $('input[type="submit"]').attr("disabled", "disabled");
        }
    });
    $('#playlist-name').on('invalid', function() { 
        $(this)[0].setCustomValidity('Please provide a playlist name.'); 
        $(this).focus(); 
    });
    $('#playlist-name').on('change', function() { $(this)[0].setCustomValidity(''); });
});