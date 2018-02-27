'use strict';
module.exports = (sequelize, DataTypes) => {
  var users_songs = sequelize.define('users_songs', {
    userId: DataTypes.INTEGER,
    songId: DataTypes.INTEGER
  }, {});
  users_songs.associate = function(models) {
    // associations can be defined here
  };
  return users_songs;
};