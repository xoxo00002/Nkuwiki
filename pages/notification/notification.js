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

    async loadNotification(refresh = false){
        try{
            let userId = "";
            try{
                const wxContext = await wx.cloud.callFunction({
                    name: "login"
                });
                userId = wxContext.result._id || wxContext.result.data?._id || "";
                console.log("获取用户id", userId);
            }catch(err){
                console.log("获取用户id失败");
            }

            wx.cloud.database().collection("notification").doc(userId).update({
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