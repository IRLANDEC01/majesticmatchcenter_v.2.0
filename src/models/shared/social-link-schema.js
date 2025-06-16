import mongoose from 'mongoose';

const socialValidators = {
  discord: (v) => /discord\.gg|discord\.com|dis\.gd/.test(v),
  twitch: (v) => /twitch\.tv/.test(v),
  youtube: (v) => /youtube\.com|youtu\.be/.test(v),
  telegram: (v) => /t\.me|telegram\.me|telegram\.org/.test(v),
  tiktok: (v) => /tiktok\.com|vm\.tiktok\.com/.test(v),
};

const errorMessages = {
  discord: 'Discord ссылка должна содержать домен discord.gg/, discord.com/ или dis.gd/',
  twitch: 'Twitch ссылка должна содержать домен twitch.tv/',
  youtube: 'YouTube ссылка должна содержать домен youtube.com/ или youtu.be/',
  telegram: 'Telegram ссылка должна содержать домен t.me/, telegram.me/ или telegram.org/',
  tiktok: 'TikTok ссылка должна содержать домен tiktok.com/ или vm.tiktok.com/',
};

const socialLinkSchema = new mongoose.Schema({
  _id: false,
  platform: {
    type: String,
    required: true,
    enum: {
      values: Object.keys(socialValidators),
      message: 'Платформа {VALUE} не поддерживается.',
    }
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // 'this' здесь - это sub-document, поэтому мы можем получить доступ к platform
        const platform = this.platform;
        if (!socialValidators[platform]) {
          return false;
        }
        return socialValidators[platform](v);
      },
      message: (props) => {
        // Находим нужный sub-document в родительском массиве, чтобы получить платформу.
        const parentArray = props.ownerDocument().socialLinks;
        const linkObject = parentArray.find(link => link.url === props.value);
        const platform = linkObject ? linkObject.platform : 'unknown';
        return errorMessages[platform] || 'Некорректный URL.';
      }
    }
  }
});

export default socialLinkSchema; 