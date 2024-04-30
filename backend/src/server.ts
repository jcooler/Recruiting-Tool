import connectDB from './util/db';
import app from './app';

const port = process.env.PORT || 5001;  

(async () => {
    try {
     
        await connectDB();
        console.log('Connected to MongoDB successfully');

     
        app.listen(port, () => {
            console.log(`Server is running flawlessly on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to connect to database:', error);
        process.exit(1); 
    }
})();
