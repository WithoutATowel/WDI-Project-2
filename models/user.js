'use strict';
module.exports = (sequelize, DataTypes) => {
  var user = sequelize.define('user', {
    spotifyId: DataTypes.STRING,
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    displayName: DataTypes.STRING,
    accessToken: DataTypes.STRING,
    refreshToken: DataTypes.STRING,
    songDataDownloaded: DataTypes.BOOLEAN
  }, {});
  user.associate = function(models) {
    models.user.belongsToMany(models.playlist, {through: models.users_playlists});
    models.user.belongsToMany(models.song, {through: models.users_songs});
    models.user.belongsToMany(models.artist, {through: models.users_artists});
  };
  return user;
};