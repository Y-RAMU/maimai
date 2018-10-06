let maimai_url = "https://maimai-net.com/maimai-mobile/";
let user_url = "playerData/";
let master_url = "music/masterGenre/";
let remaster_url = "music/remasterGenre/";

let userData = {
    "name": "",
    "rating": "",
    "title": "",
    "best": ""
}


/** Music Data Model **/
/*
let musicData = {
    "title": "",
    "diff": "",
    "level": "",
    "score": "",
    "achievement": "",
    "rate": ""
}
*/

let musicList = []

let mergeList = []

let sortedList = []

let targetList = []


let GetUserData = function () {
    $.ajax({
        type: "GET",
        url: maimai_url + user_url,
        async: false,
        dataType: "html"
    })
        .done(function (data) {
            let name = $(data).find(".underline")[0].innerText;
            let rating = $(data).find(".underline")[1].innerText;
            let title = $(data).find(".blue")[0].innerText;

            userData.name = name;
            userData.rating = rating;
            userData.title = title;

            // ベスト枠計算
            let sum = 0;
            for (i = 0; i < 30; i++) {
                let data = sortedList[i];
                let rateMas = ("data_Mas" in data) ? parseFloat(data.data_Mas.rate) : 0;
                let rateReMas = ("data_ReMas" in data) ? parseFloat(data.data_ReMas.rate) : 0;

                sum += (rateMas < rateReMas) ? rateReMas : rateMas;
            }

            userData.best = (sum / 30).toFixed(2);
        })
        .fail(function (jqXHR, textStatus, erroThrown) {
            alert(
                "Failed:Connect to UserData\n" +
                "XmlHttpRequest: " + jqXHR + "\n" +
                "TextStatus: " + textStatus + "\n" +
                "ErrorThrown: " + erroThrown
            );
        });
}

let GetMusicData = function (diff_addr) {
    $.ajax({
        type: "GET",
        url: maimai_url + diff_addr,
        async: false
    })
        .done(function (data) {
            let accordion = $(data).find("#accordion");
            let h3List = Array.prototype.slice.call($(accordion).find("h3"));
            let musicTitleList = h3List.map(GetMusicTitle);
            let musicAchievementList = h3List.map(GetMusicAchievement);
            let musicScoreList = Array.prototype.slice.call($(accordion).find(".list"))
                .map(function (data) {
                    return $(data).find("td")[3].innerText.replace(/,/g, "");
                });

            let diff = "";
            if (diff_addr.includes("remaster")) {
                diff = "Re:Master";
            } else {
                diff = "Master";
            }

            PushMusicData(diff, musicTitleList, musicAchievementList, musicScoreList);
        })
        .fail(function (jqXHR, textStatus, erroThrown) {
            alert(
                "Failed:Connect to" + diff_addr + "\n" +
                "XmlHttpRequest: " + jqXHR + "\n" +
                "TextStatus: " + textStatus + "\n" +
                "ErrorThrown: " + erroThrown
            );
        });
}

let GetMusicTitle = function (data) {
    let div = $(data).find("div");

    if (div.length == 0) {
        return data.innerText.trim();
    } else {
        return div[0].innerText.trim();
    }
}

let GetMusicAchievement = function (data) {
    let div = $(data).find("div");

    if (div.length == 0) {
        return "0";
    } else {
        return $(data).find(".achievement")[0].innerText.replace(/[^(\d|\.)]/g, "");
    }
}

let PushMusicData = function (diff, titleList, achievementList, scoreList) {
    for (i = 0; i < titleList.length; i++) {
        let musicData = {
            "title": "",
            "diff": "",
            "level": "",
            "score": "",
            "achievement": "",
            "rate": ""
        }

        musicData.title = titleList[i];
        musicData.diff = diff;
        musicData.score = scoreList[i];
        musicData.achievement = achievementList[i];

        musicList.push(musicData);
    }
}

let CalcRating = function (level, achievement) {
    let rateSSS = parseFloat(RateSSS(level));
    let rateSS = rateSSS - 1.0;
    let rateS = parseFloat(RateS(level));

    if (100.00 <= achievement) {
        return rateSSS.toFixed(2);
    } else if (99.00 <= achievement && achievement < 100.00) {
        return CalcWithLSM(99.00, 100.00, rateSS, rateSSS - 0.25, achievement).toFixed(2);
    } else if (97.00 <= achievement && achievement < 99.00) {
        return CalcWithLSM(97.00, 99.00, rateS, rateSSS - 1.25, achievement).toFixed(2);
    } else {
        return 0;
    }
}

let RateSSS = function (level) {
    if (13.0 <= level) {
        return (level + 3.0);
    } else if (12.0 <= level && level < 13.0) {
        return (14.0 + 2.0 * (level - 12.0));
    } else {
        return 0.0
    }
}

let RateS = function (level) {
    if (13.0 <= level) {
        return (level + 0.5);
    } else if (12.0 <= level && level < 13.0) {
        return (12.0 + 1.5 * (level - 12.0));
    } else {
        return 0.0;
    }
}

let CalcWithLSM = function (x1, x2, y1, y2, p) {
    let a = (y2 - y1) / (x2 - x1);
    let b = y1 - a * x1;

    return (a * p + b);
}

let MergeMusicList = function (list) {
    for (i = 0; i < list.length; i++) {
        for (j = 0; j < musicList.length; j++) {
            if (musicList[j].title == list[i].title && musicList[j].diff == list[i].diff) {
                let label = (list[i].diff == "Master") ? "data_Mas" : "data_ReMas";

                let data_model = {
                    "diff": list[i].diff,
                    "level": list[i].level,
                    "score": musicList[j].score,
                    "achievement": musicList[j].achievement,
                    "rate": ""
                }

                data_model.rate = CalcRating(parseFloat(data_model.level), parseFloat(data_model.achievement));

                let music = mergeList.find(function (e) {
                    return e.title == list[i].title;
                });

                if (typeof music == "undefined") {
                    let data = {
                        "title": list[i].title,
                    };

                    data[label] = data_model;
                    mergeList.push(data);
                } else {
                    music[label] = data_model;
                }
            }
        }
    }
}

let SortList = function () {
    for (i = 0; i < mergeList.length; i++) {
        let data = mergeList[i];
        let rateMas = ("data_Mas" in data) ? data.data_Mas.rate : 0;
        let rateReMas = ("data_ReMas" in data) ? data.data_ReMas.rate : 0;
        let rate = (rateMas < rateReMas) ? rateReMas : rateMas;

        let insertNum = -1;
        for (j = 0; j < sortedList.length; j++) {
            let s_data = sortedList[j];
            let s_rateMas = ("data_Mas" in s_data) ? s_data.data_Mas.rate : 0;
            let s_rateReMas = ("data_ReMas" in s_data) ? s_data.data_ReMas.rate : 0;
            let s_rate = (s_rateMas < s_rateReMas) ? s_rateReMas : s_rateMas;

            if (s_rate < rate) {
                insertNum = j;
                break;
            }
        }

        if (insertNum == -1) {
            sortedList.push(data);
        } else {
            sortedList.splice(insertNum, 0, data);
        }
    }
}

let PrintMusicList = function () {
    let html = "";

    html += "<html>";
    html += "<meta name=\"viewport\" content=\"width=device-width\">";  // スマホ対応
    html += "<body>";
    html += "<div style=\"text-align:center\">" + userData.name  + "</div><br>";
    html += "<div style=\"text-align:center\">" + userData.title + "</div><br>";
    html += "<div style=\"text-align:center\">" + "現在/ベスト : " + userData.rating + "/" + userData.best + "</div><br>";
    html += "<br>";

    html += "<table border=1 align=\"center\">";
    for (i = 0; i < sortedList.length; i++) {
        let data = sortedList[i];

        html += "<tr>";
        html += "<th colspan=\"5\" bgcolor=\"#000000\"><font color=\"#ffffff\">" + (i+1) + ". " + data.title + "</font></th>";
        html +="</tr>";

        if ("data_Mas" in data) {
            html += "<tr>";
            html += "<td bgcolor=\"#8b008b\"><font color=\"#ffffff\">" + data.data_Mas.diff + "</font></td>";
            html += "<td>" + data.data_Mas.level + "</td>";
            html += "<td>" + data.data_Mas.score + "</td>";
            html += "<td>" + data.data_Mas.achievement + "%" + "</td>";
            html += "<td>" + data.data_Mas.rate + "</td></tr>";
        }

        if ("data_ReMas" in data) {
            html += "<tr>";
            html += "<td bgcolor=\"#e8d1ff\"><font color=\"#000000\">" + data.data_ReMas.diff + "</font></td>";
            html += "<td>" + data.data_ReMas.level + "</td>";
            html += "<td>" + data.data_ReMas.score + "</td>";
            html += "<td>" + data.data_ReMas.achievement + "%" + "</td>";
            html += "<td>" + data.data_ReMas.rate + "</td></tr>";
        }
    }
    html += "</table></body></html>";

    let win = window.open("", "maimai Rate Calculator", "width=500, height=500");
    win.document.write(html);
}


$.getScript("https://rawgit.com/Y-RAMU/maimai/maimai_RateCalc/maimai_RateCalc/music.js", function(){
    console.log("Get Master...");
    GetMusicData(master_url);
    console.log("Get Re:Master...");
    GetMusicData(remaster_url);
    console.log("Merge Master 12+...");
    MergeMusicList(mas12p);
    console.log("Merge Master 13...");
    MergeMusicList(mas13);
    console.log("Merge Re:Master 12+...");
    MergeMusicList(remas12p);
    console.log("Merge Re:Master 13...");
    MergeMusicList(remas13);
    console.log("Sort List...");
    SortList();
    console.log("Get UserData...");
    GetUserData();
    console.log("Print Result");
    PrintMusicList();
})
