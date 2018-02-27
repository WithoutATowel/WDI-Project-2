'use strict';
module.exports = (sequelize, DataTypes) => {
  var song = sequelize.define('song', {
    artistId: DataTypes.STRING,
    name: DataTypes.STRING,
    spotifyId: DataTypes.STRING,
    popularity: DataTypes.INTEGER,
    previewUrl: DataTypes.STRING
  }, {});
  song.associate = function(models) {
    models.song.belongsTo(models.artist);
    models.song.belongsToMany(models.user, {through: models.users_songs});
    models.song.belongsToMany(models.playlist, {through: models.playlists_songs});
  };
  return song;
};