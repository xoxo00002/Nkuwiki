const util = require("../../utils/util");
Page({
    data:{
        activeTab: "like",
        action: "点赞",
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
                    for (let i = 0; i <res.data.posts.length; i++) {
                        for (let j = 0; j < res.data.posts[i].likesUsers.length; j++) {
                            if(res.data.posts[i].likesUsers[j]!=null) {
                                this.data.like.likesUsers.push(res.data.posts[i].likesUsers[j]);
                                this.setData({
                                    [`like.likesUsers`]: this.data.like.likesUsers
                                });
                            }
                        }
                    }
                    for (let i1 = 0; i1 <res.data.posts.length; i1++) {
                        for (let j1 = 0; j1 < res.data.posts[i1].favouriteUsers.length; j1++) {
                            if(res.data.posts[i1].favouriteUsers[j1]!=null) {
                                this.data.favourite.favouriteUsers.push(res.data.posts[i1].favouriteUsers[j1]);
                                this.setData({
                                    [`favourite.favouriteUsers`]: this.data.favourite.favouriteUsers
                                });
                            }
                        }
                    }
                    for (let i2 = 0; i2 <res.data.posts.length; i2++) {
                        for (let j2 = 0; j2 < res.data.posts[i2].comments.length; j2++) {
                            this.data.comments.commentsUsers.push(res.data.posts[i2].comments[j2]);
                            this.setData({
                                [`comments.commentsUsers`]: this.data.comments.commentsUsers
                            });
                        }
                    }

                    this.setData({
                        [`like.likesUsers`]: this.data.like.likesUsers.sort((a, b) => b.likeTime - a.likeTime),
                        [`favourite.favouriteUsers`]: this.data.favourite.favouriteUsers.sort((a, b) => b.favouriteTime - a.favouriteTime),
                        [`comments.commentsUsers`]: this.data.comments.commentsUsers.sort((a, b) => b.favouriteTime - a.favouriteTime)
                    });

                    console.log(this.data.like.likesUsers);
                    console.log(this.data.favourite.favouriteUsers);
                    console.log(this.data.comments.commentsUsers);

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

                    for (let i = 0; i < this.data.comments.commentsUsers.length; i++) {
                        await wx.cloud.database().collection("users").where({
                            openid: this.data.comments.commentsUsers[i].openid
                        }).get()
                            .then(result => {
                                const date = new Date(this.data.comments.commentsUsers[i].commentTime);  // 参数需要毫秒数，所以这里将秒数乘于 1000
                                let info = {
                                    avatar: result.data[0].avatarUrl,
                                    name: result.data[0].nickName,
                                    time: util.formatRelativeTime(date),
                                    postTitle: this.data.comments.commentsUsers[i].postTitle,
                                    content:this.data.comments.commentsUsers[i].commentContent.length>10 ? this.data.comments.commentsUsers[i].commentContent.slice(0,10) + "..." : this.data.comments.commentsUsers[i].commentContent
                                };
                                this.data.comments.commentsUsersInfo.push(info);
                                this.setData({
                                    [`comments.commentsUsersInfo`]: this.data.comments.commentsUsersInfo
                                });
                                console.log(this.data.comments.commentsUsersInfo);
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
        if (event.target.dataset.tab==="like") {
            this.setData({
                action: "点赞",
                activeTab: event.target.dataset.tab
            });
        }
        else if (event.target.dataset.tab==="favourite") {
            this.setData({
                action: "收藏",
                activeTab: event.target.dataset.tab
            });
        }
        else if (event.target.dataset.tab==="comment") {
            this.setData({
                action: "评论",
                activeTab: event.target.dataset.tab
            });
        }
        else {
            this.setData({
                action: "",
                activeTab: ""
            })
        }
        console.log(this.data.activeTab)
    }

})