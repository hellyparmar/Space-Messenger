"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const express_1 = require("express");
const ws_1 = __importDefault(require("ws"));
// Polyfill WebSocket globally for Supabase realtime under Node < 22
if (typeof global.WebSocket === 'undefined') {
    global.WebSocket = ws_1.default;
}
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '', { auth: { autoRefreshToken: false, persistSession: false } });
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'No authorization token provided' });
        }
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        req.user = { id: user.id, email: user.email };
        // Keep userId for backward compatibility with existing routes
        req.userId = user.id;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Authentication failed' });
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.js.map