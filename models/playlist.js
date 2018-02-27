'use strict';
module.exports = (sequelize, DataTypes) => {
  var playlist = sequelize.define('playlist', {
    name: DataTypes.STRING,
    spotifyId: DataTypes.STRING
  }, {});
  playlist.associate = function(models) {
    models.playlist.belongsToMany(models.user, {through: models.users_playlists});
    models.playlist.belongsToMany(models.song, {through: models.playlists_songs});
  };
  return playlist;
};