'use strict';
module.exports = (sequelize, DataTypes) => {
    var users_playlists = sequelize.define('users_playlists', {
        userId: DataTypes.INTEGER,
        playlistId: DataTypes.INTEGER
    }, {});
    users_playlists.associate = function(models) {
        // associations can be defined here
    };
    return users_playlists;
};