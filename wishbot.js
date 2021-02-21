#!/usr/bin/env node


const PlugAPI = require('plugapi');
const https = require('https');
var Datastore = require('nedb');
const moment = require('moment');
const Discord = require('discord.js');
const cheerio = require('cheerio');
const client = new Discord.Client();
var login = require('./login.json')
const bot = new PlugAPI({
    email: login.email,
    password: login.password
});
var key = login.youtube_api_key;
var botid = login.botid;
bot.deleteAllChat = true;
bot.deleteCommands = false;
bot.deleteMessageBlocks = false;
bot.mutedTriggerNormalEvents = false;
bot.multiLine = true;
bot.multiLineLimit = 5;

var limitTimer;
var autoskipTimer;
var specialInterval;
var wishgameArray = {};

var mainPlaylistID = 12265017; //change to your playlist id
var specialPlaylistID = 12469688; //change to your playlist id
var jukeboxPlaylistID = 12469689; //change to your playlist id
var jukeboxPlayed = null;
var mark = null;
var mark2 = null;
var playedSongs = [];
var playedAds = [];
var jukeboxActive = false;

var specialTimer = false;
var loadAdsFirstTime = true;
var specialTrack = false;

var rouletteGame = [];
var roulette = false;
var rouletteTimer;

var songhistory = [];
var adshistory = [];
var jukebox = [];
var messagingBot = {};
var summoningHost = {};
var wisdomArray = {};
var discord_connected = false;
var reconnected = true;
var channel;

var time_limit = 600;


client.on('ready', () => {
    discord_connected = true;
    channel = client.channels.cache.find(ch => ch.name === 'summon');
});

client.on('error', (err) => {
    console.log(err.message);
});

client.login(login.discord);

//default playlist db
var db = new Datastore({
    filename: 'playlist'
});
db.loadDatabase();
//ads playlist db
var db2 = new Datastore({
    filename: 'playlist-ads'
});
db2.loadDatabase();
//blacklist playlist db
var db3 = new Datastore({
    filename: 'blacklist'
});
db3.loadDatabase();
//userdb
var userdb = new Datastore({
    filename: 'userdb'
});
userdb.loadDatabase();

const staff = [6025558, 51935849];

bot.connect(login.room); //room

bot.on(PlugAPI.events.ROOM_JOIN, (room) => {
    bot.sendChat(`/me WishBot активирован в ${room}.`); //greeting
    var url = bot.getSocketURL();
    console.log(url)
    var song = bot.getMedia();
    if (song != null) {
        bot.woot();
        var time = bot.getTimeRemaining();
        var dj = bot.getDJ();
        if (time == 0) {
            bot.moderateForceSkip(() => {
                bot.sendChat(`/me ${dj.username}Скип из-за зависания трека.`); //says skip due to song hanging bug
            });
        }
    }
});

bot.on(PlugAPI.events.USER_JOIN, (user) => {
    console.log(user);
    if (staff.includes(user.id)) {
        userdb.find({
            id: user.id
        }).limit(1).exec(function (err, docs) {
            if (!err && docs.length == 0) {
                user.lastvisit = Date.now();
                userdb.insert(user);
                setTimeout(function () {
                    bot.sendChat(`С возвращением, @${user.username}. Добро пожаловать домой!`);
                }, 5000);
            } else {
                if (Math.floor((Date.now() - docs[0].lastvisit) / 1000) > 10800) {
                    setTimeout(function () {
                        bot.sendChat(`С возвращением, @${user.username}. Добро пожаловать домой!`);
                    }, 5000);
                }
                user.lastvisit = Date.now();
                userdb.update({
                    id: user.id
                }, user, {});
            }
        });
    } else if (user.guest != true && user.id != botid) {
        currentStaff = bot.getStaff();
        var hosts = currentStaff.filter(member => member.role >= 4000);
        if (hosts.length > 0) {
            userdb.find({
                id: user.id
            }).limit(1).exec(function (err, docs) {
                if (!err && docs.length == 0) {
                    user.lastvisit = Date.now();
                    userdb.insert(user);
                    setTimeout(function () {
                        bot.sendChat(`@${user.username} Привет, я робот WishBot. Узнать больше - !help, !info.`);
                    }, 5000);
                } else {
                    if (Math.floor((Date.now() - docs[0].lastvisit) / 1000) > 10800) {
                        setTimeout(function () {
                            bot.sendChat(`@${user.username} Привет, снова.`);
                        }, 5000);
                    }
                    user.lastvisit = Date.now();
                    userdb.update({
                        id: user.id
                    }, user, {});
                }
            });
        } else {
            userdb.find({
                id: user.id
            }).limit(1).exec(function (err, docs) {
                if (!err && docs.length == 0) {
                    user.lastvisit = Date.now();
                    userdb.insert(user);
                    setTimeout(function () {
                        bot.sendChat(`@${user.username} Привет, я робот WishBot. Узнать больше - !help, !info. Хостов нет на месте, их можно призвать командой !summon.`);
                    }, 5000);
                } else {
                    if (Math.floor((Date.now() - docs[0].lastvisit) / 1000) > 10800) {
                        setTimeout(function () {
                            bot.sendChat(`@${user.username} Привет, снова. Хостов нет на месте, их можно призвать написав в чат !summon.`);
                        }, 5000);
                    }
                    user.lastvisit = Date.now();
                    userdb.update({
                        id: user.id
                    }, user, {});
                }
            });
        }
    }
});

bot.on(PlugAPI.events.USER_LEAVE, (user) => {
    userdb.find({
        id: user.id
    }).limit(1).exec(function (err, docs) {
        if (!err && docs.length != 0) {
            var time = Date.now();
            userdb.update({
                id: user.id
            }, {
                $set: {
                    lastvisit: time
                }
            }, {});
        }
    });
});

//annonce
var annonceInterval = setInterval(annonce, 900000);

function annonce() {
    bot.sendChat('@everyone Пиши \!wish в чат, чтобы испытать удачу. Узнать больше - !help, !info. Наш дискорд https://discord.gg/3y3tBYV'); //says write !wish to chat to try your luck
}

function special() {
    console.log('Special time!');
    specialTimer = true;
}

function skip() {
    var song = bot.getMedia();
    if (song != null && currentSong.cid == song.cid) {
        bot.moderateForceSkip();
    }
}

function checkPlaying() {
    var song = bot.getMedia();
    if (song != null) {
        var dj = bot.getDJ();
        var time = bot.getTimeRemaining();
        if (time == 0 && currentSong.cid == song.cid) {
            bot.moderateForceSkip(() => {
                bot.sendChat(`/me @${dj.username} Скип из-за зависания трека.`); //says skip due to song hanging bug
            });
        }
    }
}

//history clear interval
var historyInterval = setInterval(historyClear, 604800000);

var historyAdsInterval = setInterval(adsHistoryClear, 86400000);

function historyClear() {
    songhistory = songhistory.slice(Math.max(songhistory.length - 200, 0));
}

function adsHistoryClear() {
    adshistory = adshistory.slice(Math.max(adshistory.length - 50, 0));
}

function rouletteRoll() {
    console.log('Roulette Roll!')
    roulette = false;
    clearInterval(rouletteInterval);
    if (rouletteGame.length == 0) {
        rouletteGame = [];
        bot.sendChat(`@everyone Розыгрыш окончен. Победителя нет. Никто не участвовал в розыгрыше.`);
    } else {
        var userid = rouletteGame[Math.floor(Math.random() * rouletteGame.length)];
        var user = bot.getUser(userid);
        if (user == null) {
            rouletteGame = [];
            bot.sendChat(`@everyone Розыгрыш окончен. К сожалению, победитель скрылся с места преступления...`);
        } else {
            var position = bot.getWaitListPosition(userid);
            if (position != -1 && position != 0) {
                var waitlist = bot.getWaitList();
                //var max = waitlist.length - (waitlist.length - position)
                var max = waitlist.length;
                var min = 1;
                var newposition = Math.floor(Math.random() * (max - min + 1)) + min;
                if (newposition != position) {
                    bot.moderateMoveDJ(userid, newposition, () => {
                        rouletteGame = [];
                        bot.sendChat(`@everyone Розыгрыш окончен. И у нас есть победитель! Это ${user.username}, который выигрывает ${newposition} место в очереди!`);
                    });
                } else {
                    rouletteGame = [];
                    bot.sendChat(`@everyone Розыгрыш окончен. И у нас есть победитель! Это ${user.username}, который выигрывает ${newposition} место в очереди!`);
                }

            } else if (position == 0) {
                rouletteGame = [];
                bot.sendChat(`@everyone Розыгрыш окончен. Победитель ${user.username} уже у пульта. В любом случае ему повезло :laughing:`);
            } else {
                rouletteGame = [];
                bot.sendChat(`@everyone Розыгрыш окончен. Победитель ${user.username} забыл вступить в очередь, эх...`);
            }
        }
    }
}


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function checkYoutubeTracks(cids, callback) {
    if (!Array.isArray(cids)) {
        cids = [cids];
    }

    var getData = function (ids) {
        return new Promise((resolve, reject) => {
            const request = https.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,contentDetails&id=${ids}&key=${key}`, (response) => {

                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => resolve(data));
                response.on('error', (err) => reject(err));
            });
        });
    }

    var index = 0;
    var arrayLength = cids.length;
    var items = [];
    var regionblocked = [];
    var blocked = [];
    var all = [];
    var removeIndexes = [];
    for (index = 0; index < arrayLength; index += 50) {
        ArrChunk = cids.slice(index, index + 50);
        var ids = ArrChunk.join(',');
        var data = await getData(ids);
        if (data != undefined) {
            data = JSON.parse(data);
            items = items.concat(data.items);
        } else {
            console.log('Youtube API unreachable.');
        }
    }
    if (items.length == 0) {
        blocked = cids;
    } else {
        items.forEach(function (val, i) {
            all.push(val.id)
            if (val.status.embeddable == false || val.status.privacyStatus != "public" && val.status.privacyStatus != "unlisted") {
                blocked.push(val.id)
                removeIndexes.push(i)
            } else if (val.contentDetails.hasOwnProperty('regionRestriction')) {
                if (val.contentDetails.regionRestriction.hasOwnProperty('blocked')) {
                    if (val.contentDetails.regionRestriction.blocked.includes('RU')) {
                        regionblocked.push(val.id)
                        removeIndexes.push(i)
                    }
                } else if (val.contentDetails.regionRestriction.hasOwnProperty('allowed')) {
                    if (!val.contentDetails.regionRestriction.allowed.includes('RU')) {
                        regionblocked.push(val.id)
                        removeIndexes.push(i)
                    }
                }
            }

        });
        cids.forEach(function (id, i) {
            if (!all.includes(id)) {
                blocked.push(id);
            }
        });
        for (var i = removeIndexes.length - 1; i >= 0; i--) {
            items.splice(removeIndexes[i], 1);
        }
    }

    var result = [blocked, regionblocked, items]

    if (typeof callback == 'function') {
        callback(result);
    } else {
        return result;
    }
}

function skipSwitch(skiprecent, skipblacklisted, metadata, dj, song) {
    var ok = 1;
    if (metadata[0].includes(song.cid)) {
        var skipblocked = 1;
    } else {
        var skipblocked = 0;
    }
    if (metadata[1].includes(song.cid)) {
        var skipregionblocked = 1;
    } else {
        var skipregionblocked = 0;
    }

    switch (1) {
        case skipblacklisted:
            setTimeout(function () {
                var song2 = bot.getMedia();
                if (song.cid === song2.cid) {
                bot.moderateForceSkip(() => {
                    bot.sendChat(`/me @${dj.username} Скип, трек в черном списке.`); //says skip, track blacklisted
                });
            }
            }, 2000);
            break;

        case skiprecent:
            setTimeout(function () {
                var song2 = bot.getMedia();
                if (song.cid === song2.cid) {
                bot.moderateForceSkip(() => {
                    bot.sendChat(`/me @${dj.username} Скип, трек недавно играл.`); //says skip, track recently played
                });
            }
            }, 2000);
            break;

        case skipblocked:
            setTimeout(function () {
                var song2 = bot.getMedia();
                if (song.cid === song2.cid) {
                bot.moderateForceSkip(() => {
                    bot.sendChat(`/me @${dj.username} Скип удаленного или заблокированного трека.`); //says skip of deleted or blocked track
                });
            }
            }, 2000);
            break;

        case skipregionblocked:
            setTimeout(function () {
                var song2 = bot.getMedia();
                if (song.cid === song2.cid) {
                bot.moderateForceSkip(() => {
                    bot.sendChat(`/me @${dj.username} Скип заблокированного в России трека.`); //says skip track blocked in region RU
                });
            }
            }, 2000);
            break;
        case ok:
            setTimeout(function () {
                bot.woot();
            }, 2000);
            var time = bot.getTimeRemaining();
            if (time > time_limit && time_limit != 0) {
                if (dj.id == 6025558 || dj.id == botid) { //exception for host and bot to play long tracks. Сhange first dj.id to yours.
                    console.log(`${dj.username} plays a long track`);
                } else {
                    setTimeout(function () {
                        bot.sendChat(`/me @${dj.username} Треки дольше 10 минут скипаются автоматически.`); //says tracks longer than 10 minutes skip automatically
                    }, 2000);
                    let skiptime = time_limit * 1000;
                    limitTimer = setTimeout(skip, skiptime);
                }
            } else {
                time = (time + 5) * 1000;
                autoskipTimer = setTimeout(checkPlaying, time);
            }
            break;
    }
}


function wordEnding(mes, value) {
    var ending = '';
    var lastdigits = +value.toString().slice(-2);
    if (mes === 'mins') {
        if (lastdigits == 1) {
            ending = 'у';
        } else if (lastdigits == 0) {
            ending = '';
        } else if (lastdigits <= 4) {
            ending = 'ы';
        } else if (lastdigits > 20) {
            lastdigits = +lastdigits.toString().slice(-1);
            if (lastdigits == 1) {
                ending = 'у';
            } else if (lastdigits == 0) {
                ending = '';
            } else if (lastdigits <= 4) {
                ending = 'ы';
            } else {
                ending = '';
            }
        } else {
            ending = '';
        }
    } else if (mes === 'hours') {
        if (lastdigits == 1) {
            ending = '';
        } else if (lastdigits == 0) {
            ending = 'ов';
        } else if (lastdigits <= 4) {
            ending = 'а';
        } else if (lastdigits > 20) {
            lastdigits = +lastdigits.toString().slice(-1);
            if (lastdigits == 1) {
                ending = '';
            } else if (lastdigits == 0) {
                ending = 'ов';
            } else if (lastdigits <= 4) {
                ending = 'а';
            } else {
                ending = 'ов';
            }
        } else {
            ending = 'ов';
        }
    }
    return ending;
}


async function wisdom(sendWisdom) {
    let promise = new Promise((resolve, reject) => {
        const request = https.get(`https://randstuff.ru/saying/`, (response) => {

            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });
            response.on('end', () => resolve(data));
            response.on('error', (err) => reject(err));
        });


    });
    let data = await promise;
    if (data != undefined) {
        var $ = cheerio.load(data);
        var saying = $('#saying .text tbody tr td').text();
        console.log(saying);
        sendWisdom(saying)
    } else {
        var saying = false;
        sendWisdom(saying)
    }
};


// very smart retrying function(found in plugapi issues) 
function Promisify(call, autoretry, timeout) {
    if (timeout == undefined) {
        timeout = 2000;
    }
    let resolved = false;
    return new Promise(
        (resolve, reject) => {
            var caller = () => {
                let retry = null;
                if (autoretry) {
                    let doRetry = () => {
                        console.log('PlugAPI call timed out, retrying..');
                        caller();
                    };
                    retry = setTimeout(doRetry, timeout);
                }
                call((err, data) => {
                    if (retry) clearTimeout(retry);
                    if (resolved) return;
                    resolved = true;
                    if (err) {
                        console.log('PlugAPI error: ' + err);
                        reject(err);
                    } else
                        resolve(data)
                });
            };
            caller();
        }
    );
}


async function addSongs(pl_name, amount) {
    var recently_played = [];
    if (pl_name === 'main') {
        var playlist = db;
        var h = songhistory;
    } else if (pl_name === 'ads') {
        var playlist = db2;
        var h = adshistory;
    }
    var history = bot.getHistory();
    history.forEach((track, i) => {
        recently_played.push(track.media.cid)
    });

    var countSongs = function () {
        return new Promise((resolve, reject) => {
            playlist.count({
                $and: [{
                        unavailable: "no"
                    },
                    {
                        songid: {
                            $nin: h
                        }
                    },
                    {
                        songid: {
                            $nin: recently_played
                        }
                    },
                    {
                        songid: {
                            $nin: ids
                        }
                    }
                ]
            }, function (err, count) {
                if (err) {
                    console.log(err);
                    reject();
                } else {
                    resolve(count);
                }
            });
        });
    }

    var songs = [];

    var getRandomSong = function () {
        return new Promise((resolve, reject) => {
            countSongs().then((count) => {
                var randomNumber = Math.floor(Math.random() * (count - 1 + 1)) + 1;
                var skipCount = randomNumber - 1;
                playlist.find({
                    $and: [{
                            unavailable: "no"
                        },
                        {
                            songid: {
                                $nin: h
                            }
                        },
                        {
                            songid: {
                                $nin: recently_played
                            }
                        },
                        {
                            songid: {
                                $nin: ids
                            }
                        }
                    ]
                }).skip(skipCount).limit(1).exec(function (err, docs) {
                    if (err) {
                        console.log(err);
                        reject();
                    } else {
                        resolve(docs);
                    }
                });
            })
        });
    }

    var updateBlocked = function (blocked) {
        return new Promise((resolve, reject) => {
            playlist.update({
                songid: {
                    $in: blocked
                }
            }, {
                $set: {
                    unavailable: "yes"
                }
            }, {
                multi: true
            }, function (err, rep) {
                if (err) {
                    console.log(err);
                    reject();
                } else
                    resolve(rep);
            });
        });
    }

    var items = [];
    var ids = [];
    var toUpdate = [];
    while (items.length < amount) {
        var ids2 = []
        var a = amount - items.length;
        for (var i = 0; i < a; i++) {
            var docs = await getRandomSong();
            ids2.push(docs[0].songid);
            ids.push(docs[0].songid);
        }
        var metadata = await checkYoutubeTracks(ids2);
        var blocked = metadata[0]
        var regionblocked = metadata[1]
        var allblocked = blocked.concat(regionblocked);
        toUpdate = toUpdate.concat(allblocked);
        var items = items.concat(metadata[2]);
    }
    var updated = await updateBlocked(toUpdate);
    console.log(updated + ' updated as unavailable');
    var songs = [];
    for (var item of items) {
        if (pl_name === 'main') {
            songhistory.push(item.id);
        } else if (pl_name === 'ads') {
            adshistory.push(item.id);
        }
        var title = item.snippet.title;
        var author = item.snippet.channelTitle;
        var image = item.snippet.thumbnails.default.url;
        var yf_duration = moment.duration(item.contentDetails.duration, moment.ISO_8601);
        var duration = yf_duration.asSeconds()
        var sdata = {
            cid: item.id,
            format: 1,
            image: image,
            duration: duration,
            title: title,
            author: author
        }
        songs.push(sdata);
    }

    return songs;
}


function clearPlaylist(pid) {
    return new Promise((resolve, reject) => {
        Promisify((callback) => bot.getPlaylistMedias(pid, callback), true, 10000).then((songs) => {
            console.log('Songs to clear: ', songs.length);
            var delsongs = [];
            songs.forEach(function (song, i) {
                delsongs.push(song.id);
            });
            if (delsongs.length > 0) {
                bot.removeSongFromPlaylist(pid, delsongs, (err, data) => {
                    if (err) {
                        console.log(err);
                        reject();
                    } else {
                        console.log("Deleted all tracks");
                        resolve();
                    }
                });
            } else {
                console.log("Playlist is empty");
                resolve();
            }
        });
    });
}

function startPlaying() {
    return new Promise((resolve, reject) => {
        Promisify((callback) => bot.joinBooth(callback), true).then(resolve());
    });
}

function stopPlaying() {
    return new Promise((resolve, reject) => {
        Promisify((callback) => bot.leaveBooth(callback), true).then(resolve());
    });
}

function checkBlacklist(cid) {
    return new Promise(
        (resolve, reject) => {
            db3.find({
                songid: cid
            }).limit(1).exec(function (err, docs) {
                if (docs.length > 0) {
                    console.log(docs);
                    var skipblacklisted = 1;
                    resolve(skipblacklisted);
                } else if (docs.length == 0) {
                    var skipblacklisted = 0;
                    resolve(skipblacklisted);
                } else if (err) {
                    console.log(err);
                    reject();
                }
            });
        });
}

//what to do on song change
bot.on(PlugAPI.events.ADVANCE, (data) => {
    clearTimeout(autoskipTimer);
    clearTimeout(limitTimer);
    var position = bot.getWaitListPosition(botid);
    var song = bot.getMedia();
    var dj = bot.getDJ();
    if (song != null && reconnected == false) {

        var checkForSpecialtrack = function () {
            return new Promise(
                (resolve, reject) => {
                    if (specialTrack === false && position == 0) {
                        if (!jukebox.includes(song.cid)) {
                            if (!playedSongs.includes(song.cid)) {
                                playedSongs.push(song.id);
                            }
                            resolve();
                        } else {
                            resolve();
                        }
                    } else if (specialTrack === true && jukeboxActive === false && position == 0) {
                        bot.activatePlaylist(mainPlaylistID, (err, pl) => {
                            if (err) {
                                console.log(err);
                                reject();
                            } else {
                                if (!playedAds.includes(song.cid)) {
                                    playedAds.push(song.id);
                                }
                                specialTrack = false;
                                specialInterval = setInterval(special, 3600000);
                                bot.sendChat('/me @everyone Рекламная пауза.');
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
                });
        }


        var removeJukeboxLastTrack = function () {
            return new Promise(
                (resolve, reject) => {
                    if (jukeboxPlayed !== null) {
                        bot.removeSongFromPlaylist(jukeboxPlaylistID, jukeboxPlayed, (err, rem) => {
                            if (err) {
                                console.log(err);
                                reject();
                            } else {
                                console.log("Deleted jukebox track: " + jukeboxPlayed);
                                jukeboxPlayed = null;
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
                });
        }

        var JukeboxIteration = function () {
            return new Promise(
                (resolve, reject) => {
                    if (jukebox.includes(song.cid) && position == 0) {
                        var index = jukebox.indexOf(song.cid);
                        jukebox.splice(index, 1);
                        jukeboxPlayed = song.id;
                        if (jukebox.length == 0) {
                            if (specialTrack === true) {
                                bot.activatePlaylist(specialPlaylistID, (err, pl) => {
                                    if (err) {
                                        console.log(err);
                                        reject();
                                    } else {
                                        console.log('Switch from jukebox to ads.')
                                        jukeboxActive = false;
                                        resolve();
                                    }
                                });
                            } else {
                                bot.activatePlaylist(mainPlaylistID, (err, pl) => {
                                    if (err) {
                                        console.log(err);
                                        reject();
                                    } else {
                                        console.log('Switch from jukebox to default.')
                                        jukeboxActive = false;
                                        resolve();
                                    }
                                });
                            }
                        } else {
                            resolve();
                        }
                    } else {
                        resolve();
                    }
                });
        }

        var checkForSpecialTimer = function () {
            return new Promise(
                (resolve, reject) => {
                    if (specialTimer === true && loadAdsFirstTime === false && mark !== song.cid && jukeboxActive === false) {
                        clearInterval(specialInterval);
                        bot.activatePlaylist(specialPlaylistID, (err, pl) => {
                            if (err) {
                                console.log(err);
                                reject();
                            } else {
                                specialTrack = true;
                                specialTimer = false;
                                resolve();
                            }
                        });
                    } else if (specialTimer === true && loadAdsFirstTime === true && mark !== song.cid && jukeboxActive === false) {
                        clearInterval(specialInterval);
                        specialTimer = false;
                        loadAdsFirstTime = false;
                        addSongs('ads', 50).then((songs) => {
                            console.log('Ads: ' + songs.length);
                            mark2 = songs[25].cid;
                            Promisify((callback) => bot.addSongToPlaylist(specialPlaylistID, songs, callback), true, 20000).then(() => {
                                bot.activatePlaylist(specialPlaylistID, (err, pl) => {
                                    if (err) {
                                        console.log(err);
                                        reject();
                                    } else {
                                        specialTrack = true;
                                        resolve();
                                    }
                                });
                            });
                        });

                    } else {
                        resolve();
                    }
                });
        }

        var checkForMarkTrack = function () {
            return new Promise(
                (resolve, reject) => {
                    if (mark == song.cid && position == 0) {
                        var toDelete = playedSongs.slice(0);
                        toDelete.pop();
                        bot.removeSongFromPlaylist(mainPlaylistID, toDelete, (err, rem) => {
                            if (err) {
                                console.log(err);
                                reject();
                            } else {
                                console.log('Deleted: ' + toDelete.length);
                                playedSongs.splice(0, toDelete.length);
                                addSongs('main', 100).then((songs) => {
                                    console.log('Songs: ' + songs.length);
                                    mark = songs[0].cid;
                                    Promisify((callback) => bot.addSongToPlaylist(mainPlaylistID, songs, callback), true, 20000).then(() => {
                                        console.log('Mark track maintenance completed');
                                        resolve()
                                    });
                                });
                            }
                        });
                    } else if (mark2 == song.cid && position == 0) {
                        var toDelete = playedAds.slice(0);
                        toDelete.pop();
                        bot.removeSongFromPlaylist(specialPlaylistID, toDelete, (err, rem) => {
                            if (err) {
                                console.log(err);
                                reject();
                            } else {
                                console.log('Deleted: ' + toDelete.length);
                                playedAds.splice(0, toDelete.length);
                                addSongs('ads', 25).then((songs) => {
                                    console.log('Ads: ' + songs.length);
                                    mark2 = songs[0].cid;
                                    Promisify((callback) => bot.addSongToPlaylist(specialPlaylistID, songs, callback), true, 20000).then(() => {
                                        console.log('Mark2 track maintenance completed');
                                        resolve()
                                    });
                                });
                            }
                        });
                    } else {
                        resolve();
                    }
                });
        }

        checkForSpecialtrack().then(() => {
            removeJukeboxLastTrack().then(() => {
                JukeboxIteration().then(() => {
                    checkForSpecialTimer().then(() => {
                        checkForMarkTrack();
                    });
                });
            });
        });

    }


    reconnected = false;
    if (song != null) {
        currentSong = song;
        if (position == 0) {
            lastSong = currentSong;
        }
        var skiprecent = 0;
        delay(4000).then(() => {
            bot.getHistory((history) => {
                const found = history.some(el => el.media.cid === song.cid);
                if (found) {
                    skiprecent = 1;
                }
            });
            checkBlacklist(song.cid).then((skipblacklisted) => {
                if (song.format == 1) {
                    checkYoutubeTracks(song.cid, function (metadata) {
                            skipSwitch(skiprecent, skipblacklisted, metadata, dj, song);
                    });
                } else {
                    console.log('Soundcloud track');
                    var metadata = [
                        [],
                        [],
                        []
                    ] //there is no function to check soundcloud tracks yet
                        skipSwitch(skiprecent, skipblacklisted, metadata, dj, song);
                }
            })
        });
    }
});

// ping command
bot.on('command:ping', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.RESIDENTDJ)) {
        data.respond('Хьюстон, у нас проблемы?'); //pong message
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

// show bot capabilities
bot.on('command:bot', (data) => {
    data.respond('Список доступных команд бота https://pastebin.com/hfJQPQTe');
});

bot.on('command:help', (data) => {
    data.respond('Список доступных команд бота https://pastebin.com/hfJQPQTe');
});

//join waitlist
bot.on('command:start', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER) && bot.getWaitListPosition(botid) == -1) {
        songhistory = [];
        adshistory = [];

        jukeboxPlayed = null;
        mark = null;
        mark2 = null;
        playedSongs = [];
        playedAds = [];
        jukeboxActive = false;
        addSongs('main', 200).then((songs) => {
            console.log('Songs: ' + songs.length);
            mark = songs[100].cid;
            Promisify((callback) => bot.addSongToPlaylist(mainPlaylistID, songs, callback), true, 20000).then(() => {
                specialInterval = setInterval(special, 3600000);
                startPlaying().then(data.respond('Поехали! :smile_cat:'));
            });
        });
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});


//leave waitlist
bot.on('command:stop', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER) && bot.getWaitListPosition(botid) !== -1) {
        songhistory = [];
        adshistory = [];

        jukeboxPlayed = null;
        mark = null;
        mark2 = null;
        playedSongs = [];
        playedAds = [];
        jukeboxActive = false;
        clearInterval(specialInterval);
        stopPlaying().then(() => {
            delay(3000).then(() => {
                clearPlaylist(mainPlaylistID).then(() => {
                    delay(3000).then(() => {
                        clearPlaylist(specialPlaylistID).then(() => {
                            delay(3000).then(() => {
                                clearPlaylist(jukeboxPlaylistID).then(() => {
                                    delay(3000).then(() => {
                                        bot.activatePlaylist(mainPlaylistID, (err, pl) => {
                                            data.respond('Выход из очереди осуществлен :crying_cat_face:');
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});


//shows temp playlist
bot.on('command:playlist', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        if (data.args == 0) {
            var playlist = mainPlaylistID;
            var playlistDb = db;
        } else if (data.args[0] == 'default') {
            var playlist = mainPlaylistID;
            var playlistDb = db;
        } else if (data.args[0] == 'ads') {
            var playlist = specialPlaylistID;
            var playlistDb = db2;
        } else if (data.args[0] == 'jukebox') {
            var playlist = jukeboxPlaylistID;
            var playlistDb = null;
        }
        Promisify((callback) => bot.getPlaylistMedias(playlist, callback), true, 10000).then((songs) => {
            if (playlistDb !== null) {
                playlistDb.count({
                    unavailable: "no"
                }, function (err, count) {
                    if (!err) {
                        data.respond(`Заряжено: ${songs.length}. Всего треков: ${count}.`);
                    }
                });
            } else {
                data.respond(`Заряжено: ${songs.length}.`);
            }
        });
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

//clears temp playlist
bot.on('command:clear_playlist', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        if (bot.getWaitListPosition(botid) == -1) {
            if (data.args == 0) {
                clearPlaylist(mainPlaylistID).then(() => {
                    delay(3000).then(() => {
                        clearPlaylist(specialPlaylistID).then(() => {
                            delay(3000).then(() => {
                                clearPlaylist(jukeboxPlaylistID).then(data.respond('Все плейлисты очищены.'));
                            });
                        });
                    });
                });
            } else if (data.args[0] == 'default') {
                clearPlaylist(mainPlaylistID).then(data.respond('default плейлист очищен.'));
            } else if (data.args[0] == 'ads') {
                clearPlaylist(specialPlaylistID).then(data.respond('ads плейлист очищен.'));
            } else if (data.args[0] == 'jukebox') {
                clearPlaylist(jukeboxPlaylistID).then(data.respond('jukebox плейлист очищен.'));
            }
        } else {
            data.respond('Сначала останови бота.');
        }
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});


//blacklist
bot.on('command:blacklist', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        var song = bot.getMedia();
        if (song != null) {
            db3.find({
                songid: song.cid
            }).limit(1).exec(function (err, docs) {
                if (!err && docs.length == 0) {
                    db3.insert({
                        title: song.author + " - " + song.title,
                        songid: song.cid,
                        unavailable: "no"
                    });
                    bot.moderateForceSkip(() => {
                        data.respond('Трек добавлен в черный список.'); //says track added to blacklist
                    });
                } else {
                    data.respond('Трек уже в черном списке.');
                }
            });
        }
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

// clearing chat command
bot.on('command:clear', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        history = bot.getChatHistory();
        for (var k in history) {
            bot.moderateDeleteChat(history[k].raw.cid);
        }
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

// skip song chat command
bot.on('command:skip', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        bot.moderateForceSkip(() => {
            data.respond('Скип, бам!'); //skip
        });

    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

// add new track to playlist
bot.on('command:add', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        if (data.args.length >= 2) {
            if (data.args[0] == 'default') {
                data.args.shift()
                var ids = data.args
                var added = [];
                var inplaylist = [];
                var blocked = [];
                var processSongs = async () => {
                    var metadata = await checkYoutubeTracks(ids);
                    var skipblocked = metadata[0];
                    var skipregionblocked = metadata[1];
                    var items = metadata[2];
                    blocked = skipblocked.concat(skipregionblocked);
                    for (var item of items) {
                        console.log(item.snippet.title);
                        var title = item.snippet.channelTitle + " " + item.snippet.title;
                        console.log(item.snippet.channelTitle);
                        console.log(item.id);
                        var insert = function () {
                            return new Promise((resolve, reject) => {
                                db.find({
                                    songid: item.id
                                }, function (err, docs) {
                                    if (err) {
                                        console.log(err);
                                        reject();
                                    } else if (docs.length == 0) {
                                        db.insert({
                                            title: title,
                                            songid: item.id,
                                            unavailable: "no"
                                        });
                                        added.push(item.id)
                                        resolve();
                                    } else {
                                        inplaylist.push(item.id)
                                        resolve();
                                    }
                                });
                            });
                        }
                        await insert();
                    }
                    return [added, inplaylist, blocked];
                }

                processSongs(ids).then(([added, inplaylist, blocked]) => {
                    data.respond(`Добавлено треков: ${added.length}. ${inplaylist.length !== 0? 'Уже в плейлисте: ' + inplaylist.join(' ') + '.' : ''} ${blocked.length !== 0? 'Не добавлены: ' + blocked.join(' ') + '.' : ''}`);
                });

            } else if (data.args[0] == 'ads') {
                data.args.shift()
                var ids = data.args
                var added = [];
                var inplaylist = [];
                var blocked = [];
                var processSongs = async () => {
                    var metadata = await checkYoutubeTracks(ids);
                    var skipblocked = metadata[0];
                    var skipregionblocked = metadata[1];
                    var items = metadata[2];
                    blocked = skipblocked.concat(skipregionblocked);
                    for (var item of items) {
                        console.log(item.snippet.title);
                        var title = item.snippet.channelTitle + " " + item.snippet.title;
                        console.log(item.snippet.channelTitle);
                        console.log(item.id);
                        var insert = function () {
                            return new Promise((resolve, reject) => {
                                db2.find({
                                    songid: item.id
                                }, function (err, docs) {
                                    if (err) {
                                        console.log(err);
                                        reject();
                                    } else if (docs.length == 0) {
                                        db2.insert({
                                            title: title,
                                            songid: item.id,
                                            unavailable: "no"
                                        });
                                        added.push(item.id)
                                        resolve();
                                    } else {
                                        inplaylist.push(item.id)
                                        resolve();
                                    }
                                });
                            });
                        }
                        await insert();
                    }
                    return [added, inplaylist, blocked];
                }

                processSongs(ids).then(([added, inplaylist, blocked]) => {
                    data.respond(`Добавлено треков: ${added.length}. ${inplaylist.length !== 0? 'Уже в плейлисте: ' + inplaylist.join(' ') + '.' : ''} ${blocked.length !== 0? 'Не добавлены: ' + blocked.join(' ') + '.' : ''}`);
                });
            } else if (data.args[0] == 'blacklist') {
                data.args.shift()
                var ids = data.args
                var added = [];
                var inplaylist = [];
                var blocked = [];
                var processSongs = async () => {
                    var metadata = await checkYoutubeTracks(ids);
                    var skipblocked = metadata[0];
                    var skipregionblocked = metadata[1];
                    var items = metadata[2];
                    blocked = skipblocked.concat(skipregionblocked);
                    for (var item of items) {
                        console.log(item.snippet.title);
                        var title = item.snippet.channelTitle + " " + item.snippet.title;
                        console.log(item.snippet.channelTitle);
                        console.log(item.id);
                        var insert = function () {
                            return new Promise((resolve, reject) => {
                                db3.find({
                                    songid: item.id
                                }, function (err, docs) {
                                    if (err) {
                                        console.log(err);
                                        reject();
                                    } else if (docs.length == 0) {
                                        db3.insert({
                                            title: title,
                                            songid: item.id,
                                            unavailable: "no"
                                        });
                                        added.push(item.id)
                                        resolve();
                                    } else {
                                        inplaylist.push(item.id)
                                        resolve();
                                    }
                                });
                            });
                        }
                        await insert();
                    }
                    return [added, inplaylist, blocked];
                }

                processSongs(ids).then(([added, inplaylist, blocked]) => {
                    data.respond(`Добавлено треков: ${added.length}. ${inplaylist.length !== 0? 'Уже в плейлисте: ' + inplaylist.join(' ') + '.' : ''} ${blocked.length !== 0? 'Не добавлены: ' + blocked.join(' ') + '.' : ''}`);
                });
            } else {
                data.respond('Неверно указан аргумент плейлиста.');
            }

        } else {
            data.respond('Не указаны необходимые аргументы.');
        }
    } else {
        data.respondTimeout('Permission denied.', 5);
    }

});


bot.on('command:del', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        if (data.args.length >= 2) {
            if (data.args[0] == 'default') {
                data.args.shift()
                var ids = data.args
                var removed = [];
                var notInPlaylist = []
                var processSongs = async () => {
                    for (var id of ids) {
                        var remove = function () {
                            return new Promise((resolve, reject) => {
                                db.remove({
                                    songid: id
                                }, {
                                    multi: true
                                }, (err, deleted) => {
                                    if (err) {
                                        console.log(err);
                                        reject();
                                    } else if (deleted !== 0) {
                                        console.log(deleted)
                                        removed.push(id);
                                        resolve();
                                    } else {
                                        notInPlaylist.push(id);
                                        resolve();
                                    }
                                });
                            });
                        }
                        await remove();
                    }
                    return [removed, notInPlaylist];
                }
                processSongs(ids).then(([removed, notInPlaylist]) => {
                    data.respond(`Удалено треков: ${removed.length}. ${notInPlaylist.length !== 0? 'Не найдено в плейлисте: ' + notInPlaylist.join(' ') : ''}`);
                });
            } else if (data.args[0] == 'ads') {
                data.args.shift()
                var ids = data.args
                var removed = [];
                var notInPlaylist = []
                var processSongs = async () => {
                    for (var id of ids) {
                        var remove = function () {
                            return new Promise((resolve, reject) => {
                                db2.remove({
                                    songid: id
                                }, {
                                    multi: true
                                }, (err, deleted) => {
                                    if (err) {
                                        console.log(err);
                                        reject();
                                    } else if (deleted !== 0) {
                                        console.log(deleted)
                                        removed.push(id);
                                        resolve();
                                    } else {
                                        notInPlaylist.push(id);
                                        resolve();
                                    }
                                });
                            });
                        }
                        await remove();
                    }
                    return [removed, notInPlaylist];
                }
                processSongs(ids).then(([removed, notInPlaylist]) => {
                    data.respond(`Удалено треков: ${removed.length}. ${notInPlaylist.length !== 0? 'Не найдено в плейлисте: ' + notInPlaylist.join(' ') : ''}`);
                });
            } else if (data.args[0] == 'blacklist') {
                data.args.shift()
                var ids = data.args
                var removed = [];
                var notInPlaylist = []
                var processSongs = async () => {
                    for (var id of ids) {
                        var remove = function () {
                            return new Promise((resolve, reject) => {
                                db3.remove({
                                    songid: id
                                }, {
                                    multi: true
                                }, (err, deleted) => {
                                    if (err) {
                                        console.log(err);
                                        reject();
                                    } else if (deleted !== 0) {
                                        console.log(deleted)
                                        removed.push(id);
                                        resolve();
                                    } else {
                                        notInPlaylist.push(id);
                                        resolve();
                                    }
                                });
                            });
                        }
                        await remove();
                    }
                    return [removed, notInPlaylist];
                }
                processSongs(ids).then(([removed, notInPlaylist]) => {
                    data.respond(`Удалено треков: ${removed.length}. ${notInPlaylist.length !== 0? 'Не найдено в плейлисте: ' + notInPlaylist.join(' ') : ''}`);
                });
            }
        } else {
            data.respond('Не указаны необходимые аргументы.');
        }

    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});


// wish game - 10% chance to get to the top of waitlist (move to last position if you lose)
bot.on('command:wish', (data) => {
    var pos = bot.getWaitListPosition(data.raw.uid);
    if (pos == -1) {
        data.respond('Для игры займи место в очереди.');
    } else if (pos == 0) {
        data.respond('Братик, братишка, ты и так у пульта, куда ж тебе еще надо? :laughing: ');
    } else {
        var timestamp = Math.floor(Date.now() / 1000);
        if (wishgameArray[data.raw.uid] > timestamp) {
            var remaining = Math.ceil(((wishgameArray[data.raw.uid] - timestamp) / 60));
            var ending = wordEnding('mins', remaining);
            data.respondTimeout(`Ты сможешь попытать удачу через ${remaining} минут${ending}.`, 5);
        } else {
            var usertime = timestamp + 900;
            wishgameArray[data.raw.uid] = usertime;
            var random_boolean = Math.random() < 0.1;
            if (random_boolean) {
                bot.moderateMoveDJ(data.raw.uid, 1, () => {
                    data.respond('Повезло!'); // says you win
                });
            } else {
                var waitlist = bot.getWaitList();
                if (waitlist.length == pos) {
                    data.respond('Упс... Повезет в другой раз! Попробуй снова через 15 минут.'); // says you lose, try again in 15 minutes
                } else {
                    bot.moderateMoveDJ(data.raw.uid, waitlist.length, () => {
                        data.respond('Упс... Повезет в другой раз! Попробуй снова через 15 минут.'); // says you lose, try again in 15 minutes
                    });
                }
            }
        }
    }
});


// command shows uptime of the process
bot.on('command:uptime', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.BOUNCER)) {
        var uptime = Math.floor(process.uptime());
        var durationValue = moment.duration(uptime, 'seconds');
        var hours = Math.floor(durationValue.asHours());
        var mins = Math.floor(durationValue.asMinutes()) - hours * 60;
        var secs = Math.floor(durationValue.asSeconds()) - (mins * 60) - (hours * 60 * 60);
        if (hours < 10) {
            hours = "0" + hours;
        }
        if (mins < 10) {
            mins = "0" + mins;
        }
        if (secs < 10) {
            secs = "0" + secs;
        }
        console.log(`${hours}h:${mins}m:${secs}s`)
        data.respond(`${hours}h:${mins}m:${secs}s`);


    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

bot.on(PlugAPI.events.CHAT, function (data) {
    var timestamp = Math.floor(Date.now() / 1000);
    console.log(`[${data.id}] [${data.from.username}] ${data.message}`);
    if (data.from.id != botid && data.message.includes('@WishBot')) {
        if (messagingBot[data.from.id] == undefined || timestamp - messagingBot[data.from.id] > 86400) {
            messagingBot[data.from.id] = timestamp;
            bot.sendChat(`@${data.from.username} 01001110 01101111 00100000 01001100 01101111 01110110 01100101 00100000 01000110 01101111 01110010 00100000 01010010 01101111 01100010 01101111 01110100 01110011 :robot_face:`);
        }
    }
});

bot.on('command:info', (data) => {
    data.respond('Важная инфа https://pastebin.com/8B1Hd9XN | Plug.dj туториал https://imgur.com/nb4hCKX | Discord https://discord.gg/3y3tBYV | Vk https://vk.com/wishmusic');
});

bot.on('command:roulette', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        if (roulette === true) {
            data.respondTimeout('Рулетка уже запущена.', 5);
        } else {
            roulette = true;
            rouletteTimer = setTimeout(rouletteRoll, 60000);
            bot.sendChat(`@everyone Рулетка запущена. Розыгрыш состоится через 1 минуту. Вступай в очередь и пиши !join, чтобы присоединиться или !leave, чтобы выйти из игры.`);
        }
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

bot.on('command:join', (data) => {
    if (roulette == true) {
        var index = rouletteGame.indexOf(data.from.id);
        if (index == -1) {
            rouletteGame.push(data.from.id);
            data.respond('Ты записался на розыгрыш.');
        } else {
            data.respond('Ты уже в списке на розыгрыш.');
        }
    } else {
        data.respond('Рулетка в данный момент неактивна.');
    }
});

bot.on('command:leave', (data) => {
    if (roulette == true) {
        var index = rouletteGame.indexOf(data.from.id);
        if (index != -1) {
            rouletteGame.splice(index, 1);
            data.respond('Ты отказался от участия в розыгрыше.');
        } else {
            data.respond('Тебя нет в списке на розыгрыш.');
        }
    } else {
        data.respond('Рулетка в данный момент неактивна.');
    }
});


bot.on('command:jukebox', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        if (bot.getWaitListPosition(botid) !== -1) {
            if (data.args.length >= 1) {
                var ids = data.args;
                var added = [];
                var inplaylist = [];
                var blocked = [];
                var processSongs = async () => {
                    var metadata = await checkYoutubeTracks(ids);
                    var skipblocked = metadata[0];
                    var skipregionblocked = metadata[1];
                    var items = metadata[2];
                    blocked = skipblocked.concat(skipregionblocked);
                    for (var item of items) {
                        var index = jukebox.indexOf(item.id);
                        if (index == -1) {
                            var title = item.snippet.title;
                            var author = item.snippet.channelTitle;
                            var image = item.snippet.thumbnails.default.url;
                            var yf_duration = moment.duration(item.contentDetails.duration, moment.ISO_8601);
                            var duration = yf_duration.asSeconds()
                            var sdata = {
                                cid: item.id,
                                format: 1,
                                image: image,
                                duration: duration,
                                title: title,
                                author: author
                            }
                            added.push(sdata);
                            jukebox.push(item.id);
                        } else {
                            inplaylist.push(item.id)
                        }
                    }
                    return [added, blocked, inplaylist];
                }
                processSongs(ids).then(([added, blocked, inplaylist]) => {
                    if (added.length !== 0) {
                        Promisify((callback) => bot.addSongToPlaylist(jukeboxPlaylistID, added, callback), true, 20000).then(() => {
                            bot.activatePlaylist(jukeboxPlaylistID, (err, pl) => {
                                if (err) {
                                    console.log(err)
                                } else {
                                    jukeboxActive = true;
                                    data.respond(`Треков добавлено в музыкальный автомат: ${added.length}. ${inplaylist.length !== 0? 'Уже в музыкальном автомате: ' + inplaylist.join(' ') + '.' : ''} ${blocked.length !== 0? 'Не добавлены: ' + blocked.join(' ') + '.' : ''}`);
                                }
                            });
                        });

                    } else {
                        data.respond(`Треков добавлено в музыкальный автомат: ${added.length}. ${inplaylist.length !== 0? 'Уже в музыкальном автомате: ' + inplaylist.join(' ') + '.' : ''} ${blocked.length !== 0? 'Не добавлены: ' + blocked.join(' ') + '.' : ''}`);
                    }
                });
            } else {
                data.respond('Не указаны необходимые аргументы.');
            }
        } else {
            data.respond('Бот не играет, для начала запустите его.');
        }
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});


bot.on('command:woot', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        bot.woot();
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

bot.on('command:meh', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        bot.meh();
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

bot.on('command:sink', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        var waitlist = bot.getWaitList();
        bot.moderateMoveDJ(botid, waitlist.length, () => {
            data.respond('Уступаю.');
        });
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

bot.on('command:summon', (data) => {
    currentStaff = bot.getStaff();
    var hosts = currentStaff.filter(member => member.role >= 4000);
    if (hosts.length > 0) {
        data.respondTimeout('В комнате уже есть хост. Задай вопрос ему.', 5);
    } else {
        var timestamp = Math.floor(Date.now() / 1000);
        if (timestamp - summoningHost[data.from.id] < 86400) {
            data.respondTimeout('Ты уже вызывал хоста. Эту команду можно использовать раз в 24 часа.', 5);
        } else {
            summoningHost[data.from.id] = timestamp;
            if (discord_connected == true) {
                channel.send(`<@&735763960992890920> ${data.from.username}(${data.from.id}) вызывает в wishmaster.`);
                data.respond('Хост призывается...');
            } else {
                data.respond('В данный момент эта функция недоступна.');
            }
        }
    }
});

bot.on('command:limit', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        if (data.args[0] != undefined) {
            var l = parseInt(data.args[0], 10);
            if (isNaN(parseInt(l, 10))) {
                data.respond('Неверный аргумент.');
            } else {
                time_limit = l * 60;
                if (l == 0) {
                    data.respond('Лимит на длину трека отключен.');
                } else {
                    var ending = wordEnding('mins', l);
                    data.respond(`Установлен лимит в ${l} минут${ending} на длину трека.`);
                }
            }

        } else {
            data.respond('Не указан аргумент.');
        }

    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

bot.on('command:ban', (data) => {
    if (data.havePermission(PlugAPI.ROOM_ROLE.MANAGER)) {
        if (data.args[0] != undefined) {
            var id = parseInt(data.args[0], 10);
            bot.moderateBanUser(id, 5, bot.BAN.PERMA)
        }
    } else {
        data.respondTimeout('Permission denied.', 5);
    }
});

//rock, paper, scissors game
bot.on('command:rps', (data) => {
    var rps = Math.floor(Math.random() * (2 - 0 + 1)) + 0;
    if (rps == 0) {
        data.respond('выкидывает камень! :fist:');
    } else if (rps == 1) {
        data.respond('выкидывает ножницы! :v:');
    } else if (rps == 2) {
        data.respond('выкидывает бумагу! :hand:');
    }
});

//ask command
bot.on('command:ask', (data) => {
    var percent = Math.floor(Math.random() * (100 - 0 + 1)) + 0;
    data.respond(`в данный момент вероятность этого равна ${percent}%`);
});

bot.on('command:wisdom', (data) => {
    var timestamp = Math.floor(Date.now() / 1000);
    if (wisdomArray[data.from.id] > timestamp) {
        var remaining = Math.ceil(((wisdomArray[data.raw.uid] - timestamp) / 3600))
        if (remaining == 1) {
            remaining = Math.ceil(((wisdomArray[data.raw.uid] - timestamp) / 60));
            var ending = wordEnding('mins', remaining);
            data.respondTimeout(`Обратись за мудростью через ${remaining} минут${ending}.`, 5);
        } else {
            var ending = wordEnding('hours', remaining);
            data.respondTimeout(`Обратись за мудростью через ${remaining} час${ending}.`, 5);
        }
    } else {
        wisdom(function (saying) {
            if (saying != false) {
                wisdomArray[data.from.id] = timestamp + 86400;
                data.respond(saying);
            } else {
                data.respond('Модуль мудрости недоступен.');
            }
        });
    }
});

//reconnect on close or error
const reconnect = () => {
    reconnected = true;
    bot.connect(login.room);
    console.log('Reconnecting..');
};

bot.on('close', reconnect);
bot.on('error', reconnect);