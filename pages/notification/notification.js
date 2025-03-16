Page({
    data:{
        likesUsers:[],
        favouriteUsers: [],
        comment: []
    },

    onLoad() {
        console.log("加载notification")
        this.loadNotification();
    },

    async loadNotification(){
        try{
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
        }catch(err){
            console.log("加载notification失败");
        }


    }
})