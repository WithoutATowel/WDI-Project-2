'use strict';
module.exports = (sequelize, DataTypes) => {
  var artist = sequelize.define('artist', {
    name: DataTypes.STRING,
    spotifyId: DataTypes.STRING,
    popularity: DataTypes.INTEGER
  }, {});
  artist.associate = function(models) {
    models.artist.belongsToMany(models.user, {through: models.users_artists});
    models.artist.hasMany(models.song);
  };
  return artist;
};