const util = require("../../utils/util");
Page({
    data:{
        likesUsers:[],
        favouriteUsers: [],
        comment: [],
        likesUsersInfo:[],
        likesUsersName:[]
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

            /*wx.cloud.database().collection("notification").doc(openId).update({
                data: {
                    isRead: true
                },
                success: function (res){
                    console.log(res.data);
                }
            });*/
        }catch(err){
            console.log("加载notification失败");
        }

        try{
            wx.cloud.database().collection("notification").doc(openId).get()
                .then(async res => {
                    for (let i = res.data.posts.length - 1; i >= 0; i--) {
                        for (let j = res.data.posts[i].likesUsers.length - 1; j >= 0; j--) {
                            if(res.data.posts[i].likesUsers[j]!=null) {
                                this.data.likesUsers.push(res.data.posts[i].likesUsers[j]);
                                this.setData({
                                    likesUsers: this.data.likesUsers
                                });
                            }
                        }
                    }

                    this.setData({
                        likesUsers: this.data.likesUsers.sort((a, b) => b.likeTime - a.likeTime)
                    });

                    console.log(this.data.likesUsers);

                    for (let i = 0; i < this.data.likesUsers.length; i++) {
                        await wx.cloud.database().collection("users").where({
                            openid: this.data.likesUsers[i].openid
                        }).get()
                            .then(result => {
                                const date = new Date(this.data.likesUsers[i].likeTime);  // 参数需要毫秒数，所以这里将秒数乘于 1000
                                let info = {
                                    avatar: result.data[0].avatarUrl,
                                    name: result.data[0].nickName,
                                    time: util.formatRelativeTime(date),
                                    postTitle: this.data.likesUsers[i].postTitle
                                };
                                this.data.likesUsersInfo.push(info);
                                this.setData({
                                    likesUsersInfo: this.data.likesUsersInfo
                                });
                                console.log(this.data.likesUsersInfo);
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

    //拉取用户头像
    getLikesUsersAvatar(){
      try{
            for (let i=0; i<this.data.likesUsers.length; i++) {
                wx.cloud.database().collection("users").where({
                    openid: this.data.likesUsers[i]
                }).get(res => {
                    this.data.likesUsersAvatar.push(res.data.avatarUrl);
                    this.setData({
                        likesUsersAvatar: this.data.likesUsersAvatar
                    });
                })
            }
        }catch(err){
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
    }

})