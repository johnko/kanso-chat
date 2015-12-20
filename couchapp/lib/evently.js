exports.actions = {
    _init: {
        selectors: {
            "a#allchans": {
                click: function(e) {
                    e.preventDefault();
                    $("#channels").trigger("all");
                }
            },
            "a#mychans": {
                click: function(e) {
                    e.preventDefault();
                    $("#channels").trigger("mine");
                }
            },
            "a#new": {
                click: function(e) {
                    e.preventDefault();
                    $("#chat").trigger("newChannel");
                }
            }
        }
    }
};

exports.channels = {
    _init: this.all,
    all: {
        data: function(resp) {
            return {
                channels : resp.rows.map(function(r) {
                    var v = r.value;
                    v.channel_uri = encodeURIComponent(v.channel);
                    return v;
                })
            };
        },
        mustache: "{{#channels}}" +
            "<li><a href=\"#/channel/{{{channel_uri}}}\" title=\"{{desc}}\">{{channel}}</a></li>" +
            "{{/channels}}",
        query: {
            "view" : "channels"
        }
    }
};

exports.chat = {
    join: {
        after: function(resp) {
            var chan = resp.rows[0].value;
            $$(this).channel = chan.channel;
            $("h1").text("Toast :: "+chan.channel);
            $("#chandesc").text(chan.desc);
        },
        mustache: "<ul></ul>",
        path: '/channel/:channel',
        query: function(e, p) {
            return {
                view : "channels",
                key : p.channel
            };
        },
        selectors: {
            "ul": {
                "_changes": {
                    data: function(row) {
                        var v = row.value;
                        var d = {
                            avatar_url : v.author && v.author.gravatar_url || "",
                            body : $.linkify($.mustache.escape(v.body)),
                            name : v.author && v.author.nickname || "",
                            url : v.author && v.author.url || "",
                            id : row.id,
                            created_at : $.prettyDate(v.created_at)
                        };
                        var p = $$("#profile").profile;
                        if (p && v.author && v.author.rand && (v.author.rand == p.rand)) {
                            // todo _admin owns everything...
                            d.owned = true;
                        }
                        return d;
                    },
                    mustache: "<li data-id=\"{{id}}\">" +
                        "   <div class=\"avatar\">" +
                        "       {{#avatar_url}}<img src=\"{{avatar_url}}\"/>{{/avatar_url}}" +
                        "       <br/>" +
                        "       <a class=\"name\" href=\"{{url}}\">{{name}}</a>" +
                        "   </div>" +
                        "   <div class=\"body\">{{{body}}}</div>" +
                        "   <div class=\"meta\">" +
                        "       <span class=\"date\">{{created_at}}</span>" +
                        "       {{#owned}}<a class=\"delete\" href=\"#delete\">[x]</a>{{/owned}}" +
                        "   </div>" +
                        "   <div class=\"clear\"></div>" +
                        "</li>",
                    query: function(e) {
                        var chan = e.data.args[0].rows[0].value;
                        return {
                            view : "messages",
                            limit : 25,
                            startkey : [chan.channel, {}],
                            endkey : [chan.channel],
                            reduce : false,
                            descending : true,
                            type : "newRows"
                        }
                    },
                    render: 'prepend',
                    selectors: {
                        "a#delete": {
                            click: function(e) {
                                e.preventDefault();
                                var li = $(this).parents("li");
                                var app = $$(this).app;
                                $.log("d",li);
                                var message_id = li.attr("data-id");
                                app.db.openDoc(message_id, {
                                    success : function(doc) {
                                        $.log("delete", doc)
                                        app.db.removeDoc(doc, {
                                            success : function() {
                                                li.slideUp("slow");
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
    },
    newChannel: {
        mustache: "<form>" +
            "   <h3>Create a Channel</h3>" +
            "   <p>" +
            "       <label>" +
            "           Name<br/>" +
            "           <input type=\"text\" name=\"name\">" +
            "       </label>" +
            "   </p>" +
            "   <p>" +
            "       <label>" +
            "           Description <em>(optional)</em><br/>" +
            "           <input size=\"120\" type=\"text\" name=\"desc\">" +
            "       </label>" +
            "   </p>" +
            "   <p><input type=\"submit\" value=\"Go &rarr;\"></p>" +
            "</form>",
        selectors: {
            "form": {
                submit: function(e) {
                    e.preventDefault();
                    var f = $(this);
                    var app = $$(f).app;
                    var name = $("input[name=name]", f).val();
                    var doc = {
                        id : "toast.channel:"+name,
                        channel : name,
                        desc : $("input[name=desc]", f).val(),
                        type : "channel",
                        author : $$("#profile").profile
                    };
                    app.db.saveDoc(doc, {
                        success : function() {
                            $("#chat").trigger("join", [{channel:name}]);
                            $("#channels").trigger("all");
                        }
                    });
                }
            }
        }
    }
};

exports.profile = {
    loggedOut: {
        mustache: "<p>Please log in to chat.</p>"
    },
    profileReady: {
        mustache: "<form>" +
            "   <label>" +
            "      {{nickname}} says:" +
            "      <input size=\"100\" type=\"text\" name=\"message\" autocomplete=\"off\">" +
            "   </label>" +
            "   <input type=\"submit\" value=\"Say it\">" +
            "</form>",
        selectors: {
            "form": {
                submit: function(e) {
                    e.preventDefault();
                    var f = $(this);
                    var doc = {
                        body : $("input[name=message]", f).val(),
                        channel : $$("#chat").channel,
                        author : $$("#profile").profile,
                        created_at : new Date()
                    };
                    $$(f).app.db.saveDoc(doc, {
                        success : function() {
                            $("input[name=message]", f).val("");
                        }
                    })
                }
            }
        }
    }
};
