'use strict';
module.exports = (sequelize, DataTypes) => {
  var users_artists = sequelize.define('users_artists', {
    userId: DataTypes.INTEGER,
    artistId: DataTypes.INTEGER
  }, {});
  users_artists.associate = function(models) {
    // associations can be defined here
  };
  return users_artists;
};