const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const videoRoutes = require('./routes/video.routes');
const logoRoutes = require('./routes/logo.routes');
const imageRoutes = require('./routes/image.routes');
const musicRoutes = require('./routes/music.routes');
const projectRoutes = require('./routes/project.routes');
const exportRoutes = require('./routes/export.routes');

Object.values(config.storage).forEach((dir) => require('fs').mkdirSync(dir, { recursive: true }));

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));

app.use('/media/uploads', express.static(config.storage.uploads));
app.use('/media/thumbnails', express.static(config.storage.thumbnails));
app.use('/media/logos', express.static(config.storage.logos));
app.use('/media/images', express.static(config.storage.images));
app.use('/media/music', express.static(config.storage.music));
app.use('/media/exports', express.static(config.storage.exports));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/videos', videoRoutes);
app.use('/api/logos', logoRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/export', exportRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`News video editor API listening on http://localhost:${config.port}`);
});
