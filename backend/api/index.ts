import connectDB from '../src/util/db'; 
import app from '../src/app'; 


(async () => {
    try {
        await connectDB();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Failed to connect to database:', error);
        process.exit(1); 
    }
})();

export default app;
