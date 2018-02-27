'use strict';
module.exports = (sequelize, DataTypes) => {
  var playlists_songs = sequelize.define('playlists_songs', {
    playlistId: DataTypes.INTEGER,
    songId: DataTypes.INTEGER
  }, {});
  playlists_songs.associate = function(models) {
    // associations can be defined here
  };
  return playlists_songs;
};