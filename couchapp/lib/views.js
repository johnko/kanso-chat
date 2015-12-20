exports.authors = {
    map: function(doc) {
        if (doc.channel && doc.message) {
            var m = doc.message;
            if (m && m.author && m.author) {
                emit(m.author, null);
            }
        }
    }
};

exports.channels = {
    map: function(doc) {
        if (doc.type == "channel" && doc.channel) {
            emit(doc.channel, doc);
        }
    }
};

exports.messages = {
    map: function(doc) {
        if (doc.channel && doc.body) {
            emit([doc.channel, doc._local_seq], doc);
        }
    },
    reduce: '_count'
};

exports.userProfile = {
    map: function(doc) {
        if (doc.type == "userProfile") {
            emit(doc.name, doc);
        }
    }
};
