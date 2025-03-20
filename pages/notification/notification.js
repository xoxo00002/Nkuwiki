const util = require("../../utils/util");
Page({
    data:{
        activeTab: "like",
        like:{
            likesUsers:[],
            likesUsersInfo:[]
        },
        favourite: {
            favouriteUsers: [],
            favouriteUsersInfo: []
        },
        comments:{
            commentsUsers: [],
            commentsUsersInfo: []
        }
    },

    async loadNotification(){
        try{
            var openId = "";
            try{
                const wxContext = await wx.cloud.callFunction({
                    name: "getOpenID"
                });
                openId = wxContext.result.openid;

                console.log("获取用户id", openId);
            }catch(err){
                console.log("获取用户id失败");
            }

        }catch(err){
            console.log("加载notification失败");
        }

        try{
            wx.cloud.database().collection("notification").doc(openId).get()
                .then(async res => {
                    for (let i = res.data.posts.length - 1; i >= 0; i--) {
                        for (let j = res.data.posts[i].likesUsers.length - 1; j >= 0; j--) {
                            if(res.data.posts[i].likesUsers[j]!=null) {
                                this.data.like.likesUsers.push(res.data.posts[i].likesUsers[j]);
                                this.data.favourite.favouriteUsers.push(res.data.posts[i].favouriteUsers[j]);
                                this.setData({
                                    [`like.likesUsers`]: this.data.like.likesUsers,
                                    [`favourite.favouriteUsers`]: this.data.favourite.favouriteUsers
                                });
                            }
                        }
                    }

                    this.setData({
                        [`like.likesUsers`]: this.data.like.likesUsers.sort((a, b) => b.likeTime - a.likeTime),
                        [`favourite.favouriteUsers`]: this.data.favourite.favouriteUsers.sort((a, b) => a.favouriteTime - a.favouriteTime)
                    });

                    console.log(this.data.like.likesUsers);
                    console.log(this.data.favourite.favouriteUsers);

                    for (let i = 0; i < this.data.like.likesUsers.length; i++) {
                        await wx.cloud.database().collection("users").where({
                            openid: this.data.like.likesUsers[i].openid
                        }).get()
                            .then(result => {
                                const date = new Date(this.data.like.likesUsers[i].likeTime);  // 参数需要毫秒数，所以这里将秒数乘于 1000
                                let info = {
                                    avatar: result.data[0].avatarUrl,
                                    name: result.data[0].nickName,
                                    time: util.formatRelativeTime(date),
                                    postTitle: this.data.like.likesUsers[i].postTitle
                                };
                                this.data.like.likesUsersInfo.push(info);
                                this.setData({
                                    [`like.likesUsersInfo`]: this.data.like.likesUsersInfo
                                });
                                console.log(this.data.like.likesUsersInfo);
                            })
                    }

                    for (let i = 0; i < this.data.favourite.favouriteUsers.length; i++) {
                        await wx.cloud.database().collection("users").where({
                            openid: this.data.favourite.favouriteUsers[i].openid
                        }).get()
                            .then(result => {
                                const date = new Date(this.data.favourite.favouriteUsers[i].favouriteTime);  // 参数需要毫秒数，所以这里将秒数乘于 1000
                                let info = {
                                    avatar: result.data[0].avatarUrl,
                                    name: result.data[0].nickName,
                                    time: util.formatRelativeTime(date),
                                    postTitle: this.data.favourite.favouriteUsers[i].postTitle
                                };
                                this.data.favourite.favouriteUsersInfo.push(info);
                                this.setData({
                                    [`favourite.favouriteUsersInfo`]: this.data.favourite.favouriteUsersInfo
                                });
                                console.log(this.data.favourite.favouriteUsersInfo);
                            })
                    }

                })
                .catch(err => {
                    console.log("拉取notification数据失败");
                })
        }catch (err){
            console.log("失败");
        }

    },

    onLoad() {
        console.log("加载notification")
        this.loadNotification();
    },

    async markAllRead(){
        let openId = "";
        try{
            const wxContext = await wx.cloud.callFunction({
                name: "getOpenID"
            });
            openId = wxContext.result.openid;

            console.log("获取用户id", openId);
        }catch(err){
            console.log("获取用户id失败");
        }
        wx.cloud.database().collection("notification").doc(openId).update({
            data: {
                isRead: true
            },
            success: function (res){
                console.log(res.data);
            }
        });
    },

    switchTab(event){
        this.setData({
            activeTab: event.target.dataset.tab
        });
        console.log(this.data.activeTab)
    }

})